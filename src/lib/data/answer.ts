import { change, formatNumber, pct } from './format';
import type { Dataset, QueryResult } from './types';

/** Turn a query result into a short, plain-English answer (no AI needed). */
export function narrate(ds: Dataset, res: QueryResult): string {
  const metricCol = ds.columns.find((c) => c.name === res.plan.metric.column);
  const fmt = (n: number) => formatNumber(n, res.plan.metric.op === 'count' || res.plan.metric.op === 'distinct' ? undefined : metricCol);
  const what = res.metricLabel.charAt(0).toLowerCase() + res.metricLabel.slice(1);
  const scope = res.plan.filters?.length ? ` for the ${res.matched.toLocaleString()} matching rows` : '';

  if (!res.rows.length) return 'No rows match that question. Try removing a filter or checking the spelling of a value.';

  if (res.chart === 'number' || !res.plan.groupBy) {
    if (res.plan.metric.op === 'count') {
      const n = res.rows[0].value;
      const of = res.plan.filters?.length && ds.rows.length ? ` (${pct(n, ds.rows.length)} of all ${ds.rows.length.toLocaleString()} rows)` : '';
      return `There ${n === 1 ? 'is' : 'are'} **${fmt(n)}** matching row${n === 1 ? '' : 's'}${of}.`;
    }
    if (res.plan.metric.op === 'distinct') return `There are **${fmt(res.rows[0].value)}** unique ${res.plan.metric.column} values${scope}.`;
    return `The ${what} is **${fmt(res.rows[0].value)}**${scope}.`;
  }

  const isTime = res.chart === 'line' || !!res.plan.groupBy.bucket;
  if (isTime && res.rows.length > 1) {
    const first = res.rows[0];
    const last = res.rows[res.rows.length - 1];
    const best = res.rows.reduce((a, b) => (b.value > a.value ? b : a));
    const worst = res.rows.reduce((a, b) => (b.value < a.value ? b : a));
    return `${res.metricLabel} went from **${fmt(first.value)}** in ${first.label} to **${fmt(last.value)}** in ${last.label} (${change(first.value, last.value)}). The best period was **${best.label}** (${fmt(best.value)}) and the weakest was ${worst.label} (${fmt(worst.value)}).`;
  }

  const [top, second, third] = res.rows;
  const additive = res.plan.metric.op === 'sum' || res.plan.metric.op === 'count';
  const share = additive && res.total ? ` (${pct(top.value, res.total)} of the total)` : '';
  if (res.plan.limit === 1) {
    return `**${top.label}** has the ${res.plan.sort === 'asc' ? 'lowest' : 'highest'} ${what}: **${fmt(top.value)}**${share}.`;
  }
  const rest = [second, third].filter(Boolean).map((r) => `${r.label} (${fmt(r.value)})`);
  const lead = res.plan.sort === 'asc' ? 'is the lowest' : 'leads';
  return `**${top.label}** ${lead} with **${fmt(top.value)}**${share}${rest.length ? `, followed by ${rest.join(' and ')}` : ''}.${res.rows.length > 3 ? ` ${res.rows.length} groups shown.` : ''}`;
}
