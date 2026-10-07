// Robust value parsing for messy business spreadsheets.

const CURRENCY = /[$€£¥₦₹]|\b(usd|eur|gbp|ngn|inr)\b/i;

/** "$1,234.50", "1 234", "(200)", "12%", "3.4k" -> number, otherwise NaN */
export function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (raw === null || raw === undefined) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(CURRENCY, '').replace(/[\s,]/g, '').replace(/%$/, '');
  let mult = 1;
  const suffix = s.match(/^(-?\d+(?:\.\d+)?)([kmb])$/i);
  if (suffix) {
    s = suffix[1];
    mult = { k: 1e3, m: 1e6, b: 1e9 }[suffix[2].toLowerCase() as 'k' | 'm' | 'b'];
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  const n = Number(s) * mult;
  return neg ? -n : n;
}

export function looksLikeCurrency(raw: string): boolean {
  return CURRENCY.test(raw);
}

const ISO = /^\d{4}-\d{1,2}(-\d{1,2})?([ T]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_NAME = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ -]\d{2,4}$/i;

/** Parses ISO dates, MM/DD/YYYY (or DD/MM when unambiguous) and "Jan 2025". Returns NaN if not a date. */
export function toDate(raw: unknown): number {
  if (raw === null || raw === undefined) return NaN;
  const s = String(raw).trim();
  if (!s) return NaN;
  if (ISO.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, (m || 1) - 1, d || 1);
  }
  const dmy = s.match(DMY);
  if (dmy) {
    let a = Number(dmy[1]);
    let b = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    // US format by default, swap when the first number can't be a month
    if (a > 12 && b <= 12) [a, b] = [b, a];
    if (a < 1 || a > 12 || b < 1 || b > 31) return NaN;
    return Date.UTC(y, a - 1, b);
  }
  if (MONTH_NAME.test(s)) {
    const [mon, yr] = s.split(/[ -]/);
    const m = MONTHS.indexOf(mon.slice(0, 3).toLowerCase());
    let y = Number(yr);
    if (y < 100) y += 2000;
    return Date.UTC(y, m, 1);
  }
  return NaN;
}
