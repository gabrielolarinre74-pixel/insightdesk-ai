import { change } from './format';
import { primaryMetric } from './profile';
import { toNumber } from './parse';
import { runQuery } from './query';
import type { ColumnProfile, Dataset, QueryResult } from './types';

export interface Kpi {
  column: ColumnProfile;
  /** sum for additive columns, average for percentages */
  value: number;
  op: 'sum' | 'avg';
  /** one value per month, oldest first (empty without a date column) */
  spark: number[];
  /** last month vs the month before, e.g. "+4.2%" */
  delta?: string;
  up?: boolean;
}

export interface Overview {
  kpis: Kpi[];
  trend?: QueryResult;
  breakdown?: QueryResult;
}

/** Headline numbers and two starter charts, computed the moment a file is opened. */
export function buildOverview(ds: Dataset, maxKpis = 4): Overview {
  const dateCol = ds.columns.find((c) => c.type === 'date');
  const primary = primaryMetric(ds);
  const nums = ds.columns.filter((c) => c.type === 'number');
  const ordered = primary ? [primary, ...nums.filter((c) => c !== primary)] : nums;

  const kpis: Kpi[] = ordered.slice(0, maxKpis).map((column) => {
    const op = column.percent ? 'avg' : 'sum';
    const value = op === 'avg' ? column.mean ?? 0 : column.sum ?? 0;
    let spark: number[] = [];
    let delta: string | undefined;
    let up: boolean | undefined;
    if (dateCol) {
      const res = runQuery(ds, { metric: { op, column: column.name }, groupBy: { column: dateCol.name, bucket: 'month' } });
      spark = res.rows.map((r) => r.value);
      if (spark.length >= 2) {
        const [prev, last] = spark.slice(-2);
        delta = change(prev, last);
        up = last >= prev;
        if (delta === 'n/a') delta = undefined;
      }
    }
    return { column, value, op, spark, delta, up };
  });

  const trend = primary && dateCol
    ? runQuery(ds, { metric: { op: primary.percent ? 'avg' : 'sum', column: primary.name }, groupBy: { column: dateCol.name, bucket: 'month' }, chart: 'line' })
    : undefined;

  const cat = ds.columns.filter((c) => c.type === 'category' && c.distinct > 1 && c.distinct <= 12).sort((a, b) => a.distinct - b.distinct)[0];
  const breakdown = cat
    ? runQuery(ds, { metric: primary ? { op: 'sum', column: primary.name } : { op: 'count' }, groupBy: { column: cat.name }, sort: 'desc', chart: 'bar' })
    : undefined;

  return { kpis, trend: trend && trend.rows.length >= 2 ? trend : undefined, breakdown };
}

/** Equal-width histogram for a numeric column, used in the column profile. */
export function histogram(ds: Dataset, column: ColumnProfile, bins = 12): { from: number; to: number; count: number }[] {
  const vals = ds.rows.map((r) => toNumber(r[column.name])).filter((n) => !Number.isNaN(n));
  if (!vals.length) return [];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (min === max) return [{ from: min, to: max, count: vals.length }];
  const width = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({ from: min + i * width, to: min + (i + 1) * width, count: 0 }));
  for (const v of vals) out[Math.min(bins - 1, Math.floor((v - min) / width))].count++;
  return out;
}
