"use client";

import { useState } from "react";
import { BarChart3, Check, Copy, Cpu, Pin, Sparkles, Table2 } from "lucide-react";
import { toast } from "sonner";
import { ChartView } from "@/components/ChartView";
import { formatNumber, pct } from "@/lib/data/format";
import { boldSegments, cn } from "@/lib/utils";
import type { Dataset, QueryResult } from "@/lib/data/types";

export interface Answer {
  id: string;
  question: string;
  understanding?: string;
  text: string;
  result?: QueryResult;
  engine: "demo" | "ai";
  error?: boolean;
}

export function AnswerCard({ answer, dataset, pinned, onPin, compact }: { answer: Answer; dataset: Dataset; pinned?: boolean; onPin?: () => void; compact?: boolean }) {
  const [view, setView] = useState<"chart" | "table">(answer.result?.chart === "table" ? "table" : "chart");
  const res = answer.result;
  const title = answer.question.charAt(0).toUpperCase() + answer.question.slice(1);
  const metricCol = dataset.columns.find((c) => c.name === res?.plan.metric.column);
  const fmt = (n: number) => formatNumber(n, res?.plan.metric.op === "count" || res?.plan.metric.op === "distinct" ? undefined : metricCol);
  const additive = res && (res.plan.metric.op === "sum" || res.plan.metric.op === "count");
  const showShare = additive && res.rows.length > 1;

  const copyCsv = () => {
    if (!res) return;
    const csv = [`"${res.groupLabel ?? "Label"}","${res.metricLabel}"`, ...res.rows.map((r) => `"${r.label.replace(/"/g, '""')}",${r.value}`)].join("\n");
    navigator.clipboard.writeText(csv).then(() => toast.success("Copied as CSV"));
  };

  const body = (
    <>
      <p className={cn("leading-relaxed", answer.error ? "text-red-600" : "text-ink-700", compact ? "text-[13px]" : "text-[15px]")}>
        {boldSegments(answer.text).map((s, i) => (s.bold ? <strong key={i} className="font-semibold text-ink-950">{s.text}</strong> : <span key={i}>{s.text}</span>))}
      </p>
      {res && res.rows.length > 0 && (
        <div className="mt-4">
          {view === "chart" && res.chart !== "table" ? (
            <ChartView result={res} metricCol={metricCol} height={compact ? 210 : 280} />
          ) : (
            <div className="max-h-72 overflow-auto rounded-xl ring-1 ring-ink-100">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-ink-50 text-left text-[11px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-3.5 py-2 font-medium">{res.groupLabel ?? "Result"}</th>
                    <th className="px-3.5 py-2 text-right font-medium">{res.metricLabel}</th>
                    {showShare && <th className="w-40 px-3.5 py-2 text-right font-medium">Share</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {res.rows.map((r) => (
                    <tr key={r.label} className="hover:bg-ink-50/60">
                      <td className="px-3.5 py-2">{r.label}</td>
                      <td className="px-3.5 py-2 text-right font-mono tabular-nums">{fmt(r.value)}</td>
                      {showShare && (
                        <td className="px-3.5 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${res.total ? (r.value / res.total) * 100 : 0}%` }} /></span>
                            <span className="w-10 text-right font-mono text-xs tabular-nums text-ink-500">{pct(r.value, res.total)}</span>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <article className={cn("panel animate-rise", compact ? "p-4" : "p-5")}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <h3 className={cn("font-semibold tracking-tight", compact ? "text-sm" : "text-[15px]")}>{title}</h3>
        <div className="no-print flex shrink-0 items-center gap-1">
          {res && res.chart !== "number" && res.chart !== "table" && (
            <div className="mr-1 inline-flex rounded-lg bg-ink-100 p-0.5">
              <button className={cn("grid size-7 place-items-center rounded-md text-ink-500", view === "chart" && "bg-white text-ink-950 shadow-card")} onClick={() => setView("chart")} aria-label="Chart view"><BarChart3 className="size-3.5" /></button>
              <button className={cn("grid size-7 place-items-center rounded-md text-ink-500", view === "table" && "bg-white text-ink-950 shadow-card")} onClick={() => setView("table")} aria-label="Table view"><Table2 className="size-3.5" /></button>
            </div>
          )}
          {res && <button className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-950" onClick={copyCsv} aria-label="Copy as CSV" title="Copy as CSV"><Copy className="size-3.5" /></button>}
          {onPin && (
            <button className={cn("flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition", pinned ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-100")} onClick={onPin}>
              {pinned ? <Check className="size-3.5" /> : <Pin className="size-3.5" />}{pinned ? "Pinned" : "Pin"}
            </button>
          )}
        </div>
      </header>
      {body}
      {!compact && (res || answer.understanding) && (
        <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-100 pt-3 text-[11.5px] text-ink-500">
          <span className="inline-flex items-center gap-1 font-medium text-ink-700">{answer.engine === "ai" ? <Sparkles className="size-3 text-brand-600" /> : <Cpu className="size-3 text-brand-600" />}{answer.engine === "ai" ? "AI plan" : "Built-in parser"}</span>
          {answer.understanding && <span className="font-mono">{answer.understanding}</span>}
          {res && <span className="ml-auto font-mono tabular-nums">{res.matched.toLocaleString()} rows</span>}
        </footer>
      )}
    </article>
  );
}
