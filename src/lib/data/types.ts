export type ColumnType = 'number' | 'date' | 'category' | 'text';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  /** non-empty values */
  count: number;
  missing: number;
  distinct: number;
  /** numeric columns */
  min?: number;
  max?: number;
  sum?: number;
  mean?: number;
  /** date columns (epoch ms) */
  minDate?: number;
  maxDate?: number;
  /** most common values for category columns */
  top?: { value: string; count: number }[];
  /** looks like money (currency symbol or name like revenue/price) */
  currency?: boolean;
  /** currency symbol found in the data, e.g. "$" */
  symbol?: string;
  /** values are written as percentages, e.g. "10%" (sums are meaningless, show averages) */
  percent?: boolean;
}

export type Row = Record<string, string>;

export interface Dataset {
  name: string;
  columns: ColumnProfile[];
  rows: Row[];
}

export type Aggregate = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
export type FilterOp = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains';
export type DateBucket = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ChartKind = 'bar' | 'line' | 'pie' | 'number' | 'table';

export interface Filter {
  column: string;
  op: FilterOp;
  value: string | number;
}

/** A safe, declarative query. Nothing is ever eval'd: plans are executed by query.ts. */
export interface QueryPlan {
  metric: { op: Aggregate; column?: string };
  groupBy?: { column: string; bucket?: DateBucket };
  filters?: Filter[];
  sort?: 'desc' | 'asc' | 'time';
  limit?: number;
  chart?: ChartKind;
}

export interface QueryResult {
  plan: QueryPlan;
  /** label -> value rows */
  rows: { label: string; value: number }[];
  /** total of the metric across all groups (for shares) */
  total: number;
  matched: number;
  chart: ChartKind;
  metricLabel: string;
  groupLabel?: string;
}
