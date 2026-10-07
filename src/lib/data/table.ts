import { toDate, toNumber } from './parse';
import type { ColumnProfile, Row } from './types';

export type SortDir = 'asc' | 'desc';

/** Sort rows by a column using its inferred type. Empty values always go last. */
export function sortRows(rows: Row[], column: ColumnProfile, dir: SortDir): Row[] {
  const key = (r: Row): number | string | null => {
    const raw = (r[column.name] ?? '').trim();
    if (!raw) return null;
    if (column.type === 'number') { const n = toNumber(raw); return Number.isNaN(n) ? null : n; }
    if (column.type === 'date') { const d = toDate(raw); return Number.isNaN(d) ? null : d; }
    return raw.toLowerCase();
  };
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((r, i) => ({ r, i, k: key(r) }))
    .sort((a, b) => {
      if (a.k === null && b.k === null) return a.i - b.i;
      if (a.k === null) return 1;
      if (b.k === null) return -1;
      if (a.k < b.k) return -sign;
      if (a.k > b.k) return sign;
      return a.i - b.i; // stable
    })
    .map((x) => x.r);
}

/** Case-insensitive search across all cells. Space-separated terms must all match (in any column). */
export function searchRows(rows: Row[], query: string, columns: string[]): Row[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter((r) => {
    const hay = columns.map((c) => r[c] ?? '').join('\u0000').toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export function paginate<T>(items: T[], page: number, size: number): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { items: items.slice((p - 1) * size, p * size), page: p, pages };
}

/** Rows to CSV with proper quoting (used for exporting a filtered view). */
export function toCsv(headers: string[], rows: Row[]): string {
  const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.map(q).join(','), ...rows.map((r) => headers.map((h) => q(r[h] ?? '')).join(','))].join('\n');
}
