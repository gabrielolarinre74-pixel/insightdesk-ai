import { change, formatNumber, pct } from './format';
import { preferredAggregate, primaryMetric } from './profile';
import { runQuery } from './query';
import { toNumber } from './parse';
import type { Dataset } from './types';

export interface Insight {
  kind: 'kpi' | 'leader' | 'trend' | 'outlier' | 'quality';
  title: string;
  detail: string;
  /** a question the user can click to explore this insight */
  question?: string;
}

/** Automatic insights shown as soon as a file is loaded. */
export function generateInsights(ds: Dataset): Insight[] {
  const out: Insight[] = [];
  const metric = primaryMetric(ds);
  const dateCol = ds.columns.find((c) => c.type === 'date');
  const cats = ds.columns.filter((c) => c.type === 'category' && c.distinct > 1 && c.distinct <= 30);

  const op = metric ? preferredAggregate(metric) : 'sum';

  if (metric) {
    out.push(op === 'avg'
      ? {
          kind: 'kpi',
          title: `Average ${metric.name}: ${formatNumber(metric.mean || 0, metric)}`,
          detail: `Across ${ds.rows.length.toLocaleString()} rows, ranging from ${formatNumber(metric.min ?? 0, metric)} to ${formatNumber(metric.max ?? 0, metric)}.`,
          question: `average ${metric.name}`,
        }
      : {
          kind: 'kpi',
          title: `Total ${metric.name}: ${formatNumber(metric.sum || 0, metric, true)}`,
          detail: `Across ${ds.rows.length.toLocaleString()} rows, an average of ${formatNumber(metric.mean || 0, metric)} per row.`,
          question: `total ${metric.name}`,
        });
  }

  if (metric) {
    for (const c of cats.slice(0, 2)) {
      const res = runQuery(ds, { metric: { op, column: metric.name }, groupBy: { column: c.name } });
      const top = res.rows[0];
      if (!top) continue;
      out.push(op === 'avg'
        ? {
            kind: 'leader',
            title: `${top.label} has the highest average ${metric.name}`,
            detail: `${formatNumber(top.value, metric)} on average, against ${formatNumber(metric.mean || 0, metric)} overall, across ${res.rows.length} ${c.name.toLowerCase()} groups.`,
            question: `average ${metric.name} by ${c.name}`,
          }
        : {
            kind: 'leader',
            title: `${top.label} leads ${c.name}`,
            detail: `${formatNumber(top.value, metric, true)} of ${metric.name} (${pct(top.value, res.total)} of the total) across ${res.rows.length} ${c.name.toLowerCase()} groups.`,
            question: `${metric.name} by ${c.name}`,
          });
    }
  }

  if (metric && dateCol) {
    const res = runQuery(ds, { metric: { op, column: metric.name }, groupBy: { column: dateCol.name, bucket: 'month' } });
    if (res.rows.length >= 3) {
      const last = res.rows[res.rows.length - 1];
      const prev = res.rows[res.rows.length - 2];
      const first = res.rows[0];
      const best = res.rows.reduce((a, b) => (b.value > a.value ? b : a));
      out.push({
        kind: 'trend',
        title: `${metric.name} ${last.value >= first.value ? 'grew' : 'fell'} ${change(first.value, last.value)} from ${first.label} to ${last.label}`,
        detail: `Last month vs the one before: ${change(prev.value, last.value)}. ${op === 'avg' ? 'Highest' : 'Best'} month: ${best.label} (${formatNumber(best.value, metric, true)}).`,
        question: `${op === 'avg' ? 'average ' : ''}${metric.name} trend by month`,
      });
    }
  }

  if (metric && metric.mean !== undefined) {
    const vals = ds.rows.map((r) => toNumber(r[metric.name])).filter((n) => !Number.isNaN(n));
    const sd = Math.sqrt(vals.reduce((n, v) => n + (v - metric.mean!) ** 2, 0) / (vals.length || 1));
    const outliers = sd ? vals.filter((v) => Math.abs(v - metric.mean!) / sd > 3).length : 0;
    if (outliers)
      out.push({
        kind: 'outlier',
        title: `${outliers} unusual ${metric.name} value${outliers > 1 ? 's' : ''}`,
        detail: `More than 3 standard deviations from the average (${formatNumber(metric.mean, metric)}). Worth checking for big wins or data-entry errors.`,
        question: `maximum ${metric.name}`,
      });
  }

  const gaps = ds.columns.filter((c) => c.missing / Math.max(1, ds.rows.length) > 0.05);
  if (gaps.length)
    out.push({
      kind: 'quality',
      title: `Missing data in ${gaps.length} column${gaps.length > 1 ? 's' : ''}`,
      detail: gaps.map((c) => `${c.name}: ${pct(c.missing, ds.rows.length)} empty`).join(' · '),
    });

  return out;
}

const plural = (w: string) => (/s$/i.test(w) ? w : /[^aeiou]y$/i.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`);

/** Starter questions tailored to the uploaded columns. */
export function suggestQuestions(ds: Dataset): string[] {
  const metric = primaryMetric(ds);
  const nums = ds.columns.filter((c) => c.type === 'number');
  const cats = ds.columns.filter((c) => c.type === 'category' && c.distinct > 1 && c.distinct <= 30);
  const dateCol = ds.columns.find((c) => c.type === 'date');
  const qs: string[] = [];
  if (metric && cats[0]) qs.push(`Total ${metric.name} by ${cats[0].name}`);
  if (metric && dateCol) qs.push(`${metric.name} trend by month`);
  const ranked = [...cats].sort((a, b) => b.distinct - a.distinct)[0];
  if (metric && ranked && ranked.distinct > 5) qs.push(`Top 5 ${plural(ranked.name)} by ${metric.name}`);
  else if (metric && cats[1]) qs.push(`Which ${cats[1].name} brings the most ${metric.name}?`);
  if (cats[0]) qs.push(`Which ${cats[0].name} has the most rows?`.replace('the most rows', `the highest ${metric?.name ?? 'count'}`));
  const second = nums.find((n) => n.name !== metric?.name);
  if (second && cats[0]) qs.push(`Average ${second.name} per ${cats[0].name}`);
  if (cats[0]?.top?.[0] && metric) qs.push(`${metric.name} by month in ${cats[0].top[0].value}`.replace(' by month', dateCol ? ' by month' : ''));
  return qs.slice(0, 6);
}
