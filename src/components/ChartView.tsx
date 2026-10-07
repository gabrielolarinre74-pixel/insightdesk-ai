"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber, pct } from "@/lib/data/format";
import type { ColumnProfile, QueryResult } from "@/lib/data/types";

export const PALETTE = ["#12b76a", "#09090b", "#6ce9a6", "#52525b", "#027a48", "#a1a1aa", "#a6f4c5", "#d4d4d8"];
const AXIS = { fontSize: 11, fill: "#71717a", fontFamily: "var(--font-geist-mono)" };

export function ChartView({ result, metricCol, height = 280 }: { result: QueryResult; metricCol?: ColumnProfile; height?: number }) {
  const fmt = (n: number) => formatNumber(n, result.plan.metric.op === "count" || result.plan.metric.op === "distinct" ? undefined : metricCol, true);
  const data = result.rows.slice(0, 50).map((r) => ({ name: r.label, value: Number(r.value.toFixed(2)) }));

  if (result.chart === "number") {
    return (
      <div className="flex flex-col items-start justify-center rounded-xl bg-ink-50 px-6 py-7">
        <div className="text-[44px] font-semibold leading-none tracking-tight tabular-nums">{fmt(result.rows[0]?.value ?? 0)}</div>
        <div className="mt-2 text-sm text-ink-500">{result.metricLabel}</div>
      </div>
    );
  }

  const tooltip = (
    <Tooltip
      cursor={{ fill: "rgba(9,9,11,0.04)", stroke: "#d4d4d8" }}
      formatter={(v) => [fmt(Number(v)), result.metricLabel]}
      contentStyle={{ borderRadius: 10, border: "none", background: "#09090b", color: "#fff", fontSize: 12, boxShadow: "0 8px 24px -8px rgba(0,0,0,.4)" }}
      itemStyle={{ color: "#fff" }}
      labelStyle={{ color: "#a1a1aa", marginBottom: 2 }}
    />
  );

  if (result.chart === "pie") {
    const total = data.reduce((n, d) => n + d.value, 0);
    return (
      <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={1.5} stroke="none" startAngle={90} endAngle={-270}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            {tooltip}
          </PieChart>
        </ResponsiveContainer>
        <ul className="space-y-2 text-[13px]">
          {data.slice(0, 8).map((d, i) => (
            <li key={d.name} className="flex items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="min-w-0 flex-1 truncate text-ink-700">{d.name}</span>
              <span className="font-mono text-xs tabular-nums text-ink-500">{pct(d.value, total)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (result.chart === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12b76a" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#12b76a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f4f4f5" />
          <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
          <YAxis tickFormatter={fmt} tick={AXIS} tickLine={false} axisLine={false} width={56} />
          {tooltip}
          <Area type="monotone" dataKey="value" stroke="#12b76a" strokeWidth={2.25} fill="url(#greenFill)" dot={false} activeDot={{ r: 4, fill: "#09090b", stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (result.chart === "table") return null;

  const horizontal = data.length > 6 || data.some((d) => d.name.length > 14);
  return (
    <ResponsiveContainer width="100%" height={horizontal ? Math.max(height, data.length * 32) : height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: 0, right: 12, top: 8, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid horizontal={!horizontal} vertical={horizontal} stroke="#f4f4f5" />
        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={fmt} tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={128} tick={{ ...AXIS, fill: "#3f3f46", fontFamily: "var(--font-geist)" }} tickLine={false} axisLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ ...AXIS, fill: "#3f3f46", fontFamily: "var(--font-geist)" }} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickFormatter={fmt} tick={AXIS} tickLine={false} axisLine={false} width={56} />
          </>
        )}
        {tooltip}
        <Bar dataKey="value" radius={horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0]} maxBarSize={44}>
          {data.map((_, i) => <Cell key={i} fill={i === 0 ? "#12b76a" : "#09090b"} fillOpacity={i === 0 ? 1 : 0.85 - Math.min(i, 6) * 0.08} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ values, up = true, width = 120, height = 36 }: { values: number[]; up?: boolean; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const color = up ? "#12b76a" : "#09090b";
  const id = `sp-${up ? "u" : "d"}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} />
    </svg>
  );
}
