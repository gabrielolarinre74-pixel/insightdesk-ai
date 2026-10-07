"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/data/format";
import type { ColumnProfile, QueryResult } from "@/lib/data/types";

const COLORS = ["#0f9f7f", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#ec4899", "#64748b"];

export function ChartView({ result, metricCol, height = 280 }: { result: QueryResult; metricCol?: ColumnProfile; height?: number }) {
  const fmt = (n: number) => formatNumber(n, result.plan.metric.op === "count" || result.plan.metric.op === "distinct" ? undefined : metricCol, true);
  const data = result.rows.slice(0, 50).map((r) => ({ name: r.label, value: Number(r.value.toFixed(2)) }));

  if (result.chart === "number") {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-5xl font-semibold tracking-tight text-emerald-700 tabular-nums">{fmt(result.rows[0]?.value ?? 0)}</div>
        <div className="mt-2 text-sm text-slate-500">{result.metricLabel}</div>
      </div>
    );
  }

  const tooltip = <Tooltip formatter={(v) => [fmt(Number(v)), result.metricLabel]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />;

  if (result.chart === "pie") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          {tooltip}
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (result.chart === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f9f7f" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0f9f7f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
          {tooltip}
          <Area type="monotone" dataKey="value" stroke="#0f9f7f" strokeWidth={2.5} fill="url(#fill)" dot={{ r: 3, fill: "#0f9f7f" }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (result.chart === "table") return null;

  const horizontal = data.length > 6 || data.some((d) => d.name.length > 14);
  return (
    <ResponsiveContainer width="100%" height={horizontal ? Math.max(height, data.length * 34) : height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} stroke="#e2e8f0" />
        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
          </>
        )}
        {tooltip}
        <Bar dataKey="value" radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => <Cell key={i} fill={i === 0 ? "#0f9f7f" : "#5eead4"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

