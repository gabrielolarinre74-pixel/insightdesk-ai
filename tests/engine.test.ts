import { describe, expect, it } from 'vitest';
import { toDate, toNumber } from '@/lib/data/parse';
import { buildDataset, primaryMetric } from '@/lib/data/profile';
import { parseQuestion } from '@/lib/data/nl';
import { runQuery, validatePlan, PlanError } from '@/lib/data/query';
import { narrate } from '@/lib/data/answer';
import { generateInsights, suggestQuestions } from '@/lib/data/insights';
import { parseCsvText } from '@/lib/data/load';
import { salesSample } from '@/lib/data/samples';
import { parsePlanJson, validateAi, DEFAULT_AI } from '@/lib/ai';

const s = salesSample();
const ds = buildDataset(s.name, s.headers, s.rows);
const ask = (q: string) => {
  const p = parseQuestion(q, ds);
  if (!p) throw new Error(`not understood: ${q}`);
  return { ...p, res: runQuery(ds, p.plan) };
};

describe('parsing', () => {
  it('parses messy numbers', () => {
    expect(toNumber('$1,234.50')).toBe(1234.5);
    expect(toNumber('(200)')).toBe(-200);
    expect(toNumber('12%')).toBe(12);
    expect(toNumber('3.5k')).toBe(3500);
    expect(toNumber('abc')).toBeNaN();
  });
  it('parses dates', () => {
    expect(toDate('2025-03-14')).toBe(Date.UTC(2025, 2, 14));
    expect(toDate('03/14/2025')).toBe(Date.UTC(2025, 2, 14));
    expect(toDate('14/03/2025')).toBe(Date.UTC(2025, 2, 14));
    expect(toDate('Mar 2025')).toBe(Date.UTC(2025, 2, 1));
    expect(toDate('hello')).toBeNaN();
  });
});

describe('profiling', () => {
  it('infers column types', () => {
    const types = Object.fromEntries(ds.columns.map((c) => [c.name, c.type]));
    expect(types).toMatchObject({ 'Order ID': 'text', 'Order Date': 'date', Region: 'category', Units: 'number', Revenue: 'number' });
    expect(primaryMetric(ds)?.name).toBe('Revenue');
    expect(ds.columns.find((c) => c.name === 'Revenue')?.symbol).toBe('$');
  });
  it('loads CSV text and rejects empty files', () => {
    const d = parseCsvText('t.csv', 'name,amount\nA,10\nB,"1,000"\n');
    expect(d.rows).toHaveLength(2);
    expect(d.columns[1].sum).toBe(1010);
    expect(() => parseCsvText('e.csv', 'a,b\n')).toThrow(/no data/);
  });
});

describe('natural language questions', () => {
  it('total by category', () => {
    const { plan, res } = ask('Total revenue by region');
    expect(plan).toMatchObject({ metric: { op: 'sum', column: 'Revenue' }, groupBy: { column: 'Region' } });
    expect(res.rows).toHaveLength(4);
    expect(res.total).toBeCloseTo(ds.columns.find((c) => c.name === 'Revenue')!.sum!, 5);
  });
  it('time trend', () => {
    const { plan, res } = ask('revenue trend by month');
    expect(plan.groupBy).toEqual({ column: 'Order Date', bucket: 'month' });
    expect(res.chart).toBe('line');
    expect(res.rows).toHaveLength(12);
    expect(res.rows[0].label).toBe('Jan 2025');
  });
  it('top N and which', () => {
    expect(ask('Top 3 products by units').res.rows).toHaveLength(3);
    const which = ask('Which channel brought the most revenue?');
    expect(which.plan).toMatchObject({ limit: 1, sort: 'desc', groupBy: { column: 'Channel' } });
    expect(narrate(ds, which.res)).toMatch(/has the highest/);
  });
  it('filters by category value, month and number', () => {
    expect(ask('revenue by product in Europe').plan.filters).toEqual([{ column: 'Region', op: '=', value: 'Europe' }]);
    expect(ask('revenue in March').plan.filters).toHaveLength(2);
    const big = ask('orders over 5000');
    expect(big.plan.metric.op).toBe('count');
    expect(big.plan.filters).toEqual([{ column: 'Revenue', op: '>', value: 5000 }]);
  });
  it('counts and distinct counts', () => {
    expect(ask('how many orders from returning customers').plan).toMatchObject({ metric: { op: 'count' }, filters: [{ column: 'Customer Type', value: 'Returning' }] });
    expect(ask('how many different products').res.rows[0].value).toBe(8);
  });
  it('returns null for unrelated questions', () => {
    expect(parseQuestion('what is the weather like', ds)).toBeNull();
  });
});

describe('query safety', () => {
  it('rejects unknown columns and non-numeric sums', () => {
    expect(validatePlan(ds, { metric: { op: 'sum', column: 'Nope' } })).toMatch(/Unknown column/);
    expect(validatePlan(ds, { metric: { op: 'sum', column: 'Region' } })).toMatch(/not a numeric/);
    expect(() => runQuery(ds, { metric: { op: 'avg', column: 'Product' } })).toThrow(PlanError);
  });
  it('validates AI plans before running them', () => {
    const ok = parsePlanJson('{"metric":{"op":"sum","column":"Revenue"},"groupBy":{"column":"Region","bucket":null},"filters":null,"sort":null,"limit":null,"chart":"bar","cannotAnswer":null}', ds);
    expect(ok.plan.groupBy?.column).toBe('Region');
    expect(() => parsePlanJson('{"metric":{"op":"drop table"}}', ds)).toThrow();
    expect(() => parsePlanJson('{"metric":{"op":"sum","column":"Secret"}}', ds)).toThrow(/Unknown column/);
    expect(() => parsePlanJson('{"metric":{"op":"count"},"cannotAnswer":"No weather data"}', ds)).toThrow(/weather/);
    expect(validateAi({ ...DEFAULT_AI, engine: 'ai' })).toMatch(/API key/);
  });
});

describe('insights', () => {
  it('produces KPI, leader and trend insights with follow-up questions', () => {
    const ins = generateInsights(ds);
    expect(ins.map((i) => i.kind)).toEqual(expect.arrayContaining(['kpi', 'leader', 'trend']));
    for (const i of ins.filter((x) => x.question)) expect(parseQuestion(i.question!, ds)).not.toBeNull();
  });
  it('suggests questions the engine can answer', () => {
    const qs = suggestQuestions(ds);
    expect(qs.length).toBeGreaterThanOrEqual(4);
    for (const q of qs) expect(() => runQuery(ds, parseQuestion(q, ds)!.plan)).not.toThrow();
  });
});

describe('synonyms', () => {
  it('maps plural synonyms such as "services" to the Product column', () => {
    const p = parseQuestion('top 5 services by revenue', ds);
    expect(p?.plan.groupBy?.column).toBe('Product');
    expect(p?.plan.limit).toBe(5);
  });
});

describe('percent columns', () => {
  it('detects percentage columns and formats them with %', () => {
    const disc = ds.columns.find((c) => c.name === 'Discount')!;
    expect(disc.percent).toBe(true);
    const p = parseQuestion('average discount by region', ds)!;
    expect(narrate(ds, runQuery(ds, p.plan))).toMatch(/\d%/);
  });
});
