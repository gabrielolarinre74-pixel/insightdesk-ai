import { describe, expect, it } from 'vitest';
import { buildDataset } from '@/lib/data/profile';
import { paginate, searchRows, sortRows, toCsv } from '@/lib/data/table';
import { buildOverview, histogram } from '@/lib/data/overview';
import { marketingSample, salesSample } from '@/lib/data/samples';

const small = buildDataset('t.csv', ['Name', 'Amount', 'Date'], [
  { Name: 'beta', Amount: '$1,200', Date: '2025-03-01' },
  { Name: 'Alpha', Amount: '90', Date: '2025-01-15' },
  { Name: 'gamma', Amount: '', Date: '2025-02-10' },
  { Name: 'delta', Amount: '1,200', Date: '' },
]);
const col = (n: string) => small.columns.find((c) => c.name === n)!;

describe('table view', () => {
  it('sorts numbers numerically, not as text, and keeps blanks last', () => {
    expect(sortRows(small.rows, col('Amount'), 'asc').map((r) => r.Name)).toEqual(['Alpha', 'beta', 'delta', 'gamma']);
    expect(sortRows(small.rows, col('Amount'), 'desc').map((r) => r.Name)).toEqual(['beta', 'delta', 'Alpha', 'gamma']);
  });
  it('sorts dates chronologically and text case-insensitively', () => {
    expect(sortRows(small.rows, col('Date'), 'asc').map((r) => r.Name)).toEqual(['Alpha', 'gamma', 'beta', 'delta']);
    expect(sortRows(small.rows, col('Name'), 'asc')[0].Name).toBe('Alpha');
  });
  it('requires every search term to match somewhere in the row', () => {
    const cols = ['Name', 'Amount', 'Date'];
    expect(searchRows(small.rows, 'ALPHA', cols)).toHaveLength(1);
    expect(searchRows(small.rows, 'beta 2025-03', cols)).toHaveLength(1);
    expect(searchRows(small.rows, 'beta 2025-01', cols)).toHaveLength(0);
    expect(searchRows(small.rows, '  ', cols)).toHaveLength(4);
  });
  it('clamps pages', () => {
    const p = paginate([1, 2, 3, 4, 5], 9, 2);
    expect(p).toEqual({ items: [5], page: 3, pages: 3 });
    expect(paginate([], 1, 10).pages).toBe(1);
  });
  it('quotes CSV cells only when needed', () => {
    expect(toCsv(['a', 'b'], [{ a: 'x,y', b: 'say "hi"' }, { a: 'plain', b: '' }])).toBe('a,b\n"x,y","say ""hi"""\nplain,');
  });
});

describe('overview', () => {
  const s = salesSample();
  const ds = buildDataset(s.name, s.headers, s.rows);
  const ov = buildOverview(ds);
  it('leads with the revenue column and gives it a monthly sparkline', () => {
    expect(ov.kpis[0].column.name).toBe('Revenue');
    expect(ov.kpis[0].spark).toHaveLength(12);
    expect(ov.kpis[0].delta).toMatch(/^[+-]\d+\.\d%$/);
  });
  it('averages percentage columns instead of summing them', () => {
    const d = ov.kpis.find((k) => k.column.name === 'Discount');
    expect(d?.op).toBe('avg');
    expect(d!.value).toBeLessThan(10);
  });
  it('builds a trend and a breakdown by the smallest useful category', () => {
    expect(ov.trend?.rows).toHaveLength(12);
    expect(ov.breakdown?.groupLabel).toBe('Customer Type');
  });
  it('works without a date column', () => {
    const m = marketingSample();
    const md = buildDataset(m.name, m.headers, m.rows.map((r) => ({ ...r, Month: '' })));
    const o = buildOverview(md);
    expect(o.trend).toBeUndefined();
    expect(o.kpis[0].spark).toEqual([]);
  });
  it('bins every value into the histogram', () => {
    const h = histogram(ds, ds.columns.find((c) => c.name === 'Revenue')!, 10);
    expect(h).toHaveLength(10);
    expect(h.reduce((n, b) => n + b.count, 0)).toBe(ds.rows.length);
  });
});

describe('support sample', () => {
  it('profiles response times as numbers and the open date as a date', async () => {
    const { supportSample } = await import('@/lib/data/samples');
    const s = supportSample();
    const ds = buildDataset(s.name, s.headers, s.rows);
    const t = (n: string) => ds.columns.find((c) => c.name === n)?.type;
    expect(t('Opened')).toBe('date');
    expect(t('Resolution (hrs)')).toBe('number');
    expect(t('Priority')).toBe('category');
    expect(ds.columns.find((c) => c.name === 'CSAT')!.missing).toBeGreaterThan(0);
  });
});

describe('aggregation choice', () => {
  it('averages durations and scores but sums money and counts', async () => {
    const { supportSample } = await import('@/lib/data/samples');
    const { preferredAggregate } = await import('@/lib/data/profile');
    const { generateInsights } = await import('@/lib/data/insights');
    const s = supportSample();
    const ds = buildDataset(s.name, s.headers, s.rows);
    const c = (n: string) => ds.columns.find((x) => x.name === n)!;
    expect(preferredAggregate(c('First Response (min)'))).toBe('avg');
    expect(preferredAggregate(c('Resolution (hrs)'))).toBe('avg');
    expect(preferredAggregate(c('CSAT'))).toBe('avg');
    const sales = salesSample();
    const sd = buildDataset(sales.name, sales.headers, sales.rows);
    expect(preferredAggregate(sd.columns.find((x) => x.name === 'Revenue')!)).toBe('sum');
    expect(preferredAggregate(sd.columns.find((x) => x.name === 'Units')!)).toBe('sum');
    expect(buildOverview(ds).kpis.every((k) => k.op === 'avg')).toBe(true);
    expect(generateInsights(ds)[0].title).toMatch(/^Average First Response/);
  });
});

describe('column names that contain aggregate words', () => {
  it('does not read "(min)" in a column name as a minimum', async () => {
    const { supportSample } = await import('@/lib/data/samples');
    const { parseQuestion } = await import('@/lib/data/nl');
    const s = supportSample();
    const ds = buildDataset(s.name, s.headers, s.rows);
    expect(parseQuestion('First Response (min) by channel', ds)?.plan.metric.op).toBe('sum');
    expect(parseQuestion('average First Response (min) trend by month', ds)?.plan.metric.op).toBe('avg');
    expect(parseQuestion('minimum First Response (min)', ds)?.plan.metric.op).toBe('min');
  });
});
