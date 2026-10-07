"use client";

import { useState } from "react";
import { BarChart3, Copy, Pin, PinOff, Table2, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ChartView } from "@/components/ChartView";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  const copyCsv = () => {
    if (!res) return;
    const csv = [`"${res.groupLabel ?? "Label"}","${res.metricLabel}"`, ...res.rows.map((r) => `"${r.label.replace(/"/g, '""')}",${r.value}`)].join("\n");
    navigator.clipboard.writeText(csv).then(() => toast.success("Result copied as CSV"));
  };

  return (
    <article className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", compact ? "p-4" : "p-5")}>
      {!compact && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", answer.engine === "ai" ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700")}>
            {answer.engine === "ai" ? <><Sparkles className="mr-1 inline size-3" />AI plan</> : <><Wand2 className="mr-1 inline size-3" />Demo engine</>}
          </span>
        </div>
      )}
      {compact && <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>}
      <p className={cn("leading-relaxed", answer.error ? "text-rose-600" : "text-slate-700", compact && "text-sm")}>
        {boldSegments(answer.text).map((s, i) => (s.bold ? <strong key={i} className="font-semibold text-slate-900">{s.text}</strong> : <span key={i}>{s.text}</span>))}
      </p>
      {answer.understanding && !compact && <p className="mt-1 text-xs text-slate-400">Interpreted as: {answer.understanding}</p>}
      {res && res.rows.length > 0 && (
        <div className="mt-4">
          {view === "chart" && res.chart !== "table" ? (
            <ChartView result={res} metricCol={metricCol} height={compact ? 200 : 280} />
          ) : (
            <div className="max-h-72 overflow-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{res.groupLabel ?? "Result"}</TableHead>
                    <TableHead className="text-right">{res.metricLabel}</TableHead>
                    {additive && res.rows.length > 1 && <TableHead className="text-right">Share</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {res.rows.map((r) => (
                    <TableRow key={r.label}>
                      <TableCell>{r.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.value)}</TableCell>
                      {additive && res.rows.length > 1 && <TableCell className="text-right tabular-nums text-slate-500">{pct(r.value, res.total)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="no-print mt-3 flex flex-wrap items-center gap-1.5">
            {res.chart !== "number" && res.chart !== "table" && (
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                <button className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs", view === "chart" && "bg-white shadow-sm")} onClick={() => setView("chart")}><BarChart3 className="size-3.5" />Chart</button>
                <button className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs", view === "table" && "bg-white shadow-sm")} onClick={() => setView("table")}><Table2 className="size-3.5" />Table</button>
              </div>
            )}
            <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" onClick={copyCsv}><Copy className="size-3.5" />Copy CSV</button>
            {onPin && (
              <button className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-slate-100", pinned ? "text-emerald-700" : "text-slate-500")} onClick={onPin}>
                {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}{pinned ? "Unpin" : "Pin to dashboard"}
              </button>
            )}
            <span className="ml-auto text-[11px] text-slate-400">{res.matched.toLocaleString()} rows matched</span>
          </div>
        </div>
      )}
    </article>
  );
}
