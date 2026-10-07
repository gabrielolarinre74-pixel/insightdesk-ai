import type { ColumnProfile } from './types';

export function formatNumber(n: number, col?: ColumnProfile, compact = false): string {
  if (!Number.isFinite(n)) return '–';
  const abs = Math.abs(n);
  const digits = abs >= 100 || Number.isInteger(n) ? 0 : abs >= 1 ? 2 : 3;
  const body = compact && abs >= 10000
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n);
  if (col?.percent) return `${body}%`;
  return col?.symbol ? `${n < 0 ? '-' : ''}${col.symbol}${body.replace('-', '')}` : body;
}

export function pct(part: number, total: number): string {
  if (!total) return '0%';
  const p = (part / total) * 100;
  return `${p >= 10 ? Math.round(p) : p.toFixed(1)}%`;
}

export function change(from: number, to: number): string {
  if (!from) return 'n/a';
  const p = ((to - from) / Math.abs(from)) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}
