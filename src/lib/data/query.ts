import { toDate, toNumber } from './parse';
import type { ColumnProfile, Dataset, DateBucket, Filter, QueryPlan, QueryResult, Row } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function bucketKey(ts: number, bucket: DateBucket): { key: string; label: string } {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (bucket) {
    case 'year':
      return { key: `${y}`, label: `${y}` };
    case 'quarter': {
      const q = Math.floor(m / 3) + 1;
      return { key: `${y}-Q${q}`, label: `Q${q} ${y}` };
    }
    case 'month':
      return { key: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${MONTHS[m]} ${y}` };
    case 'week': {
      const start = new Date(Date.UTC(y, m, d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
      const iso = start.toISOString().slice(0, 10);
      return { key: iso, label: `Wk of ${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}` };
    }
    default: {
      const iso = d.toISOString().slice(0, 10);
      return { key: iso, label: `${MONTHS[m]} ${d.getUTCDate()}, ${y}` };
    }
  }
}

function col(ds: Dataset, name?: string): ColumnProfile | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  return ds.columns.find((c) => c.name.toLowerCase() === n);
}

export function matchesFilter(row: Row, f: Filter, column: ColumnProfile): boolean {
  const raw = row[column.name] ?? '';
  if (column.type === 'number') {
    const v = toNumber(raw);
    const t = toNumber(f.value);
    if (Number.isNaN(v) || Number.isNaN(t)) return false;
    switch (f.op) {
      case '=': return v === t;
      case '!=': return v !== t;
      case '>': return v > t;
      case '>=': return v >= t;
      case '<': return v < t;
      case '<=': return v <= t;
      default: return String(raw).includes(String(f.value));
    }
  }
  if (column.type === 'date') {
    const v = toDate(raw);
    const t = typeof f.value === 'number' ? f.value : toDate(f.value);
    if (Number.isNaN(v) || Number.isNaN(t)) return false;
    switch (f.op) {
      case '>': return v > t;
      case '>=': return v >= t;
      case '<': return v < t;
      case '<=': return v <= t;
      case '!=': return v !== t;
      default: return v === t;
    }
  }
  const a = String(raw).toLowerCase();
  const b = String(f.value).toLowerCase();
  switch (f.op) {
    case '!=': return a !== b;
    case 'contains': return a.includes(b);
    default: return a === b;
  }
}

export class PlanError extends Error {}

/** Validate a plan against the dataset (unknown columns, wrong types) before running it. */
export function validatePlan(ds: Dataset, plan: QueryPlan): string | null {
  const m = plan.metric;
  if (m.op !== 'count') {
    const c = col(ds, m.column);
    if (!c) return `Unknown column "${m.column ?? ''}" for ${m.op}.`;
    if (m.op !== 'distinct' && c.type !== 'number') return `"${c.name}" is not a numeric column, so it can't be ${m.op === 'avg' ? 'averaged' : 'summed'}.`;
  }
  if (plan.groupBy && !col(ds, plan.groupBy.column)) return `Unknown column "${plan.groupBy.column}" to group by.`;
  for (const f of plan.filters || []) if (!col(ds, f.column)) return `Unknown column "${f.column}" in filter.`;
  if (plan.limit !== undefined && (plan.limit < 1 || plan.limit > 1000)) return 'Limit must be between 1 and 1000.';
  return null;
}

const OP_LABEL = { sum: 'Total', avg: 'Average', count: 'Number of rows', min: 'Minimum', max: 'Maximum', distinct: 'Unique' };

export function runQuery(ds: Dataset, plan: QueryPlan): QueryResult {
  const problem = validatePlan(ds, plan);
  if (problem) throw new PlanError(problem);
  const metricCol = col(ds, plan.metric.column);
  const groupCol = plan.groupBy ? col(ds, plan.groupBy.column) : undefined;
  const filters = (plan.filters || []).map((f) => ({ f, c: col(ds, f.column)! }));
  const rows = ds.rows.filter((r) => filters.every(({ f, c }) => matchesFilter(r, f, c)));

  type Acc = { label: string; sum: number; n: number; min: number; max: number; set: Set<string> };
  const groups = new Map<string, Acc>();
  const add = (key: string, label: string, r: Row) => {
    let g = groups.get(key);
    if (!g) {
      g = { label, sum: 0, n: 0, min: Infinity, max: -Infinity, set: new Set() };
      groups.set(key, g);
    }
    if (plan.metric.op === 'count') { g.n++; return; }
    const raw = r[metricCol!.name] ?? '';
    if (plan.metric.op === 'distinct') { if (raw.trim()) g.set.add(raw.trim()); return; }
    const v = toNumber(raw);
    if (Number.isNaN(v)) return;
    g.sum += v; g.n++; g.min = Math.min(g.min, v); g.max = Math.max(g.max, v);
  };

  for (const r of rows) {
    if (!groupCol) { add('all', 'All', r); continue; }
    const raw = (r[groupCol.name] ?? '').trim();
    if (groupCol.type === 'date') {
      const ts = toDate(raw);
      if (Number.isNaN(ts)) continue;
      const { key, label } = bucketKey(ts, plan.groupBy!.bucket || 'month');
      add(key, label, r);
    } else add(raw || '(blank)', raw || '(blank)', r);
  }

  const value = (g: Acc) => {
    switch (plan.metric.op) {
      case 'count': return g.n;
      case 'distinct': return g.set.size;
      case 'avg': return g.n ? g.sum / g.n : 0;
      case 'min': return g.n ? g.min : 0;
      case 'max': return g.n ? g.max : 0;
      default: return g.sum;
    }
  };

  let out = [...groups.entries()].map(([key, g]) => ({ key, label: g.label, value: value(g) }));
  const isTime = groupCol?.type === 'date';
  const sort = plan.sort || (isTime ? 'time' : 'desc');
  if (sort === 'time') out.sort((a, b) => a.key.localeCompare(b.key));
  else out.sort((a, b) => (sort === 'asc' ? a.value - b.value : b.value - a.value));
  const total = out.reduce((n, r) => n + r.value, 0);
  if (plan.limit) out = out.slice(0, plan.limit);

  let chart = plan.chart;
  if (!chart) {
    if (!groupCol) chart = 'number';
    else if (isTime) chart = 'line';
    else if (!plan.limit && out.length <= 6 && (plan.metric.op === 'sum' || plan.metric.op === 'count')) chart = 'pie';
    else chart = 'bar';
  }

  return {
    plan,
    rows: out.map(({ label, value }) => ({ label, value })),
    total,
    matched: rows.length,
    chart,
    metricLabel: plan.metric.op === 'count' ? 'Rows' : `${OP_LABEL[plan.metric.op]} ${metricCol?.name ?? ''}`.trim(),
    groupLabel: groupCol ? (isTime ? `${groupCol.name} (${plan.groupBy!.bucket || 'month'})` : groupCol.name) : undefined,
  };
}
