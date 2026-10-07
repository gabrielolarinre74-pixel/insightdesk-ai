"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Gauge, MessageSquareText, TrendingUp, Trophy } from "lucide-react";
import { ChartView, Sparkline } from "@/components/ChartView";
import { formatNumber } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/data/insights";
import type { Overview as OverviewData } from "@/lib/data/overview";
import type { Dataset } from "@/lib/data/types";

const INSIGHT_ICON: Record<Insight["kind"], typeof Gauge> = { kpi: Gauge, leader: Trophy, trend: TrendingUp, outlier: AlertTriangle, quality: AlertTriangle };
const INSIGHT_LABEL: Record<Insight["kind"], string> = { kpi: "Headline", leader: "Leader", trend: "Trend", outlier: "Outliers", quality: "Data quality" };

export function Overview({ dataset, overview, insights, onAsk }: { dataset: Dataset; overview: OverviewData; insights: Insight[]; onAsk: (q: string) => void }) {
  const { kpis, trend, breakdown } = overview;
  const metricCol = (name?: string) => dataset.columns.find((c) => c.name === name);
  return (
    <div className="space-y-5">
      {kpis.length > 0 && (
        <div className={cn("grid gap-3 sm:grid-cols-2", kpis.length >= 4 ? "xl:grid-cols-4" : kpis.length === 3 && "xl:grid-cols-3")}>
          {kpis.map((k) => (
            <div key={k.column.name} className="panel p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] text-ink-500">{k.op === "avg" ? "Average" : "Total"} {k.column.name}</span>
                {k.delta && (
                  <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium", k.up ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-700")}>
                    {k.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{k.delta}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{formatNumber(k.value, k.column, true)}</div>
                <Sparkline values={k.spark} up={k.up} width={96} height={34} />
              </div>
              {k.spark.length > 1 && <div className="mt-2 text-[11.5px] text-ink-400">vs previous month · {k.spark.length} months</div>}
            </div>
          ))}
        </div>
      )}

      {(trend || breakdown) && (
        <div className={cn("grid gap-3", trend && breakdown && "xl:grid-cols-[1.6fr_1fr]")}>
          {trend && (
            <div className="panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold tracking-tight">{trend.metricLabel} by month</div>
                  <div className="text-[12.5px] text-ink-500">{trend.rows[0].label} to {trend.rows[trend.rows.length - 1].label}</div>
                </div>
                <button className="text-[12.5px] font-medium text-brand-700 hover:underline" onClick={() => onAsk(`${trend.plan.metric.column} trend by month`)}>Ask about this</button>
              </div>
              <ChartView result={trend} metricCol={metricCol(trend.plan.metric.column)} height={250} />
            </div>
          )}
          {breakdown && (
            <div className="panel p-5">
              <div className="mb-3">
                <div className="text-[15px] font-semibold tracking-tight">{breakdown.metricLabel} by {breakdown.groupLabel}</div>
                <div className="text-[12.5px] text-ink-500">{breakdown.rows.length} groups</div>
              </div>
              <ChartView result={{ ...breakdown, chart: "pie" }} metricCol={metricCol(breakdown.plan.metric.column)} height={210} />
            </div>
          )}
        </div>
      )}

      {insights.length > 0 && (
        <div className="panel">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
            <div className="text-[15px] font-semibold tracking-tight">What stands out</div>
            <span className="text-[12px] text-ink-400">Found automatically on load</span>
          </div>
          <ul className="divide-y divide-ink-100">
            {insights.map((i) => {
              const Icon = INSIGHT_ICON[i.kind];
              const warn = i.kind === "outlier" || i.kind === "quality";
              return (
                <li key={i.title} className="flex items-start gap-4 px-5 py-3.5">
                  <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", warn ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-700")}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-ink-400">{INSIGHT_LABEL[i.kind]}</div>
                    <div className="mt-0.5 text-[14px] font-medium">{i.title}</div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{i.detail}</p>
                  </div>
                  {i.question && (
                    <button onClick={() => onAsk(i.question!)} className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-700 shadow-card hover:bg-ink-50">
                      <MessageSquareText className="size-3.5" />Explore
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
