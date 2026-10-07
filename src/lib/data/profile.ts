import { looksLikeCurrency, toDate, toNumber } from './parse';
import type { ColumnProfile, ColumnType, Dataset, Row } from './types';

const MONEY_NAME = /(revenue|sales|amount|price|cost|spend|profit|income|total|value|budget|fee|mrr|arr|gmv)/i;
const ID_NAME = /(^id$|_id$|\bid\b|uuid|code|phone|zip|postal|sku)/i;

/** Infer the type of each column and compute summary statistics. */
export function profileColumns(headers: string[], rows: Row[]): ColumnProfile[] {
  return headers.map((name) => {
    const values = rows.map((r) => (r[name] ?? '').trim());
    const present = values.filter((v) => v !== '');
    const sample = present.slice(0, 500);
    const numeric = sample.filter((v) => !Number.isNaN(toNumber(v))).length;
    const dates = sample.filter((v) => !Number.isNaN(toDate(v)) && !/^\d+(\.\d+)?$/.test(v)).length;
    const distinct = new Set(present).size;

    let type: ColumnType;
    if (sample.length && dates / sample.length > 0.9) type = 'date';
    else if (sample.length && numeric / sample.length > 0.9 && !ID_NAME.test(name)) type = 'number';
    else if (distinct <= Math.max(25, present.length * 0.2) || distinct <= 50) type = 'category';
    else type = 'text';

    const p: ColumnProfile = { name, type, count: present.length, missing: values.length - present.length, distinct };
    if (type === 'number') {
      const nums = present.map(toNumber).filter((n) => !Number.isNaN(n));
      p.sum = nums.reduce((a, b) => a + b, 0);
      p.min = Math.min(...nums);
      p.max = Math.max(...nums);
      p.mean = nums.length ? p.sum / nums.length : 0;
      p.currency = sample.some(looksLikeCurrency) || MONEY_NAME.test(name);
      p.symbol = sample.join(' ').match(/[$€£¥₦₹]/)?.[0];
      p.percent = !p.symbol && sample.length > 0 && sample.every((v) => /%\s*$/.test(v));
    }
    if (type === 'date') {
      const ds = present.map(toDate).filter((n) => !Number.isNaN(n));
      p.minDate = Math.min(...ds);
      p.maxDate = Math.max(...ds);
    }
    if (type === 'category') {
      const counts = new Map<string, number>();
      for (const v of present) counts.set(v, (counts.get(v) || 0) + 1);
      p.top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count }));
    }
    return p;
  });
}

export function buildDataset(name: string, headers: string[], rows: Row[]): Dataset {
  const clean = headers.map((h) => h.trim()).filter(Boolean);
  return { name, columns: profileColumns(clean, rows), rows };
}

/** The numeric column a business user most likely cares about (revenue > amount > first number). */
export function primaryMetric(ds: Dataset): ColumnProfile | undefined {
  const nums = ds.columns.filter((c) => c.type === 'number');
  return nums.find((c) => /revenue|sales|deal value|income|profit|gmv/i.test(c.name)) || nums.find((c) => c.currency) || nums[0];
}
