import { primaryMetric } from './profile';
import type { Aggregate, ChartKind, ColumnProfile, Dataset, DateBucket, Filter, QueryPlan } from './types';

// ---------------------------------------------------------------------------
// Offline natural-language → QueryPlan parser ("demo engine").
// Understands questions like:
//   "total revenue by region", "top 5 products by units in 2025",
//   "average order value per channel", "revenue trend by month",
//   "how many orders from returning customers over 500"
// ---------------------------------------------------------------------------

const SYNONYMS: Record<string, string[]> = {
  revenue: ['sales', 'income', 'turnover', 'money', 'earnings'],
  sales: ['revenue', 'income'],
  units: ['quantity', 'qty', 'volume', 'items sold'],
  quantity: ['units', 'qty'],
  region: ['area', 'territory', 'location', 'market'],
  product: ['item', 'sku', 'service', 'offering', 'package'],
  channel: ['source', 'medium'],
  source: ['channel'],
  customer: ['client', 'buyer'],
  cost: ['spend', 'expense', 'budget'],
  spend: ['cost', 'budget'],
  conversions: ['sales', 'customers', 'signups'],
  leads: ['prospects', 'enquiries', 'inquiries'],
  order: ['purchase', 'transaction'],
  date: ['time', 'day'],
};

const BUCKETS: [RegExp, DateBucket][] = [
  [/\b(daily|per day|by day|each day)\b/, 'day'],
  [/\b(weekly|per week|by week|each week)\b/, 'week'],
  [/\b(quarterly|per quarter|by quarter|each quarter)\b/, 'quarter'],
  [/\b(yearly|annual(ly)?|per year|by year|each year)\b/, 'year'],
  [/\b(monthly|per month|by month|each month|month over month|over time|trend|trends|timeline|growth)\b/, 'month'],
];

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const norm = (s: string) => s.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const singular = (w: string) => (w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

function aliases(c: ColumnProfile): string[] {
  const base = norm(c.name);
  const out = new Set([base, singular(base), `${singular(base)}s`]);
  for (const word of base.split(' ')) {
    const w = singular(word);
    if (w.length > 2 && base.split(' ').length > 1 && !['total', 'amount', 'number', 'count', 'value', 'type', 'name'].includes(w)) {
      out.add(w);
      out.add(`${w}s`);
    }
    for (const s of SYNONYMS[w] || SYNONYMS[word] || []) {
      out.add(s);
      if (!s.includes(' ')) out.add(s.endsWith('y') ? `${s.slice(0, -1)}ies` : `${s}s`);
    }
  }
  return [...out].filter((a) => a.length > 1);
}

interface Mention { col: ColumnProfile; index: number; alias: string }

function findMentions(q: string, ds: Dataset): Mention[] {
  const found: Mention[] = [];
  for (const c of ds.columns) {
    let best: Mention | undefined;
    for (const a of aliases(c)) {
      const m = new RegExp(`\\b${escape(a)}\\b`).exec(q);
      if (m && (!best || a.length > best.alias.length)) best = { col: c, index: m.index, alias: a };
    }
    if (best) found.push(best);
  }
  // exact column names beat synonyms when two columns claim the same words
  return found.sort((a, b) => a.index - b.index);
}

export interface ParsedQuestion {
  plan: QueryPlan;
  /** plain-English description of how the question was understood */
  understanding: string;
}

export function parseQuestion(question: string, ds: Dataset): ParsedQuestion | null {
  const q = ` ${norm(question).replace(/[?!.]/g, ' ')} `;
  const mentions = findMentions(q, ds);
  const numeric = mentions.filter((m) => m.col.type === 'number');
  const dateCol = ds.columns.find((c) => c.type === 'date');

  // ---- aggregate ---------------------------------------------------------
  let op: Aggregate = 'sum';
  if (/\b(average|avg|mean|typical)\b/.test(q)) op = 'avg';
  else if (/\b(how many (different|unique|distinct)|number of (different|unique|distinct)|unique|distinct)\b/.test(q)) op = 'distinct';
  else if (/\b(how many|number of|count)\b/.test(q)) op = 'count';
  else if (/\b(max|maximum|largest single|biggest single)\b/.test(q)) op = 'max';
  else if (/\b(min|minimum|smallest single)\b/.test(q)) op = 'min';

  // ---- group by ----------------------------------------------------------
  let groupBy: QueryPlan['groupBy'];
  let limit: number | undefined;
  let sort: QueryPlan['sort'];
  const bucket = BUCKETS.find(([re]) => re.test(q))?.[1];

  const byMatch = q.match(/\b(?:by|per|for each|for every|each|across|split by|broken down by)\s+([a-z0-9 ]+?)(?=\s(?:in|for|where|with|from|over|under|above|below|during|last|this|and|as|top|sorted)\b|\s*$)/);
  const whichMatch = q.match(/\b(?:which|what)\s+([a-z0-9 ]+?)\s+(?:has|had|have|is|was|made|brought|generated|got|sold|drove|performs?|did)\b/);
  const topMatch = q.match(/\b(top|best|highest|bottom|worst|lowest)\s+(\d+)?\s*([a-z0-9 ]+?)(?=\s(?:by|in|for|where|with|from|over|under|during|last|this)\b|\s*$)/);

  const colFrom = (phrase?: string) => {
    if (!phrase) return undefined;
    const p = ` ${phrase} `;
    return mentions.find((m) => m.col.type !== 'number' && new RegExp(`\\b${escape(m.alias)}\\b`).test(p))?.col
      || ds.columns.find((c) => c.type !== 'number' && aliases(c).some((a) => p.includes(` ${a} `)));
  };

  if (topMatch) {
    const c = colFrom(topMatch[3]);
    if (c) {
      groupBy = { column: c.name };
      limit = topMatch[2] ? Number(topMatch[2]) : 5;
      sort = /bottom|worst|lowest/.test(topMatch[1]) ? 'asc' : 'desc';
    }
  }
  if (!groupBy && whichMatch) {
    const c = colFrom(whichMatch[1]);
    if (c) {
      groupBy = { column: c.name };
      limit = /\b(least|lowest|worst|fewest)\b/.test(q) ? 1 : 1;
      sort = /\b(least|lowest|worst|fewest)\b/.test(q) ? 'asc' : 'desc';
    }
  }
  if (!groupBy && byMatch) {
    const c = colFrom(byMatch[1]);
    if (c && c.type === 'date') groupBy = { column: c.name, bucket: bucket || 'month' };
    else if (c) groupBy = { column: c.name };
  }
  if (!groupBy && bucket && dateCol) groupBy = { column: dateCol.name, bucket };
  if (groupBy && ds.columns.find((c) => c.name === groupBy!.column)?.type === 'date' && !groupBy.bucket) groupBy.bucket = bucket || 'month';

  // ---- filters -----------------------------------------------------------
  const filters: Filter[] = [];
  for (const c of ds.columns) {
    if (c.type !== 'category' || c.name === groupBy?.column) continue;
    // longest values first so "new york" wins over "york"
    const values = [...new Set(ds.rows.map((r) => (r[c.name] ?? '').trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
    for (const v of values) {
      const nv = norm(v);
      if (nv.length < 2) continue;
      if (new RegExp(`\\b${escape(nv)}\\b`).test(q)) {
        const negated = new RegExp(`\\b(not|excluding|except|without)\\s+(the\\s+)?${escape(nv)}\\b`).test(q);
        filters.push({ column: c.name, op: negated ? '!=' : '=', value: v });
        break;
      }
    }
  }
  const cmp = [...q.matchAll(/\b(over|above|more than|greater than|at least|under|below|less than|at most)\s+\$?([\d,.]+k?)\b/g)];
  for (const m of cmp) {
    const before = q.slice(0, m.index);
    const target = [...numeric].reverse().find((n) => n.index < (m.index ?? 0))?.col || numeric[0]?.col || primaryMetric(ds);
    if (!target || /\b(top|bottom)\s*$/.test(before)) continue;
    const value = Number(m[2].replace(/,/g, '').replace(/k$/, '000'));
    const op = /over|above|more|greater/.test(m[1]) ? '>' : /at least/.test(m[1]) ? '>=' : /at most/.test(m[1]) ? '<=' : '<';
    filters.push({ column: target.name, op, value });
  }
  if (dateCol) {
    const year = q.match(/\b(?:in|during|for)\s+(20\d{2}|19\d{2})\b/);
    const monthIdx = MONTHS.findIndex((mn) => new RegExp(`\\b(in|during|for)\\s+${mn}\\b`).test(q));
    const years = new Set([dateCol.minDate, dateCol.maxDate].filter((x): x is number => x !== undefined).map((t) => new Date(t).getUTCFullYear()));
    const y = year ? Number(year[1]) : monthIdx >= 0 && years.size === 1 ? [...years][0] : monthIdx >= 0 && dateCol.maxDate ? new Date(dateCol.maxDate).getUTCFullYear() : undefined;
    if (y !== undefined && monthIdx >= 0) {
      filters.push({ column: dateCol.name, op: '>=', value: Date.UTC(y, monthIdx, 1) }, { column: dateCol.name, op: '<', value: Date.UTC(y, monthIdx + 1, 1) });
    } else if (year) {
      filters.push({ column: dateCol.name, op: '>=', value: Date.UTC(y!, 0, 1) }, { column: dateCol.name, op: '<', value: Date.UTC(y! + 1, 0, 1) });
    }
    const last = q.match(/\blast\s+(\d+)?\s*(day|week|month|quarter|year)s?\b/);
    if (last && dateCol.maxDate) {
      const n = Number(last[1] || 1);
      const end = new Date(dateCol.maxDate);
      const start = new Date(end);
      const unit = last[2];
      if (unit === 'day') start.setUTCDate(start.getUTCDate() - n);
      if (unit === 'week') start.setUTCDate(start.getUTCDate() - 7 * n);
      if (unit === 'month') start.setUTCMonth(start.getUTCMonth() - n);
      if (unit === 'quarter') start.setUTCMonth(start.getUTCMonth() - 3 * n);
      if (unit === 'year') start.setUTCFullYear(start.getUTCFullYear() - n);
      filters.push({ column: dateCol.name, op: '>', value: start.getTime() });
    }
  }

  // "orders over 5000" counts orders: an entity (ID/text column) is mentioned but no numeric column
  if (op === 'sum' && numeric.length === 0 && mentions.some((m) => m.col.type === 'text')) op = 'count';

  // ---- metric column -----------------------------------------------------
  const filterCols = new Set(filters.map((f) => f.column));
  let metricCol: ColumnProfile | undefined = numeric.find((m) => !filterCols.has(m.col.name))?.col || numeric[0]?.col;
  if (op === 'distinct') {
    const target = mentions.find((m) => m.col.type !== 'number' && m.col.name !== groupBy?.column)?.col;
    if (!target) op = 'count';
    else metricCol = target;
  }
  if (op !== 'count' && op !== 'distinct' && !metricCol) metricCol = primaryMetric(ds);
  if (op !== 'count' && !metricCol) op = 'count';
  // "how many orders" with no grouping still makes sense as a count
  if (op === 'count') metricCol = undefined;

  const chartWord = q.match(/\b(pie|bar|line|table)\b/)?.[1] as ChartKind | undefined;

  if (!groupBy && !filters.length && !mentions.length && op === 'sum') return null;

  const plan: QueryPlan = {
    metric: { op, column: metricCol?.name },
    ...(groupBy ? { groupBy } : {}),
    ...(filters.length ? { filters } : {}),
    ...(sort ? { sort } : {}),
    ...(limit ? { limit } : {}),
    ...(chartWord ? { chart: chartWord } : {}),
  };
  return { plan, understanding: describePlan(plan) };
}

export function describePlan(plan: QueryPlan): string {
  const opName = { sum: 'total', avg: 'average', count: 'number of rows', min: 'minimum', max: 'maximum', distinct: 'number of unique' }[plan.metric.op];
  let s = plan.metric.op === 'count' ? 'Count rows' : `${opName.charAt(0).toUpperCase() + opName.slice(1)} ${plan.metric.column}`;
  if (plan.groupBy) s += ` by ${plan.groupBy.column}${plan.groupBy.bucket ? ` (${plan.groupBy.bucket})` : ''}`;
  if (plan.filters?.length)
    s += ` where ${plan.filters.map((f) => `${f.column} ${f.op} ${typeof f.value === 'number' && f.value > 1e11 ? new Date(f.value).toISOString().slice(0, 10) : f.value}`).join(' and ')}`;
  if (plan.limit) s += `, ${plan.sort === 'asc' ? 'bottom' : 'top'} ${plan.limit}`;
  return s;
}
