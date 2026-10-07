"use client";

import { useMemo } from "react";
import Dropzone from "react-dropzone";
import { ArrowRight, ArrowUpRight, FileSpreadsheet, Headphones, Lock, Megaphone, MessageSquareText, ShoppingBag, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Sparkline } from "@/components/ChartView";
import { buildDataset } from "@/lib/data/profile";
import { buildOverview } from "@/lib/data/overview";
import { runQuery } from "@/lib/data/query";
import { formatNumber } from "@/lib/data/format";
import { MAX_FILE_BYTES } from "@/lib/data/load";
import { cn } from "@/lib/utils";
import type { SampleDataset } from "@/lib/data/samples";

const SAMPLE_ICON: Record<string, typeof ShoppingBag> = { sales: ShoppingBag, marketing: Megaphone, support: Headphones };

export function Landing({ samples, onFile, onSample, busy }: { samples: SampleDataset[]; onFile: (f: File) => void; onSample: (s: SampleDataset) => void; busy: boolean }) {
  // The preview card is computed from the first sample, so it shows real output of the app
  const preview = useMemo(() => {
    const s = samples[0];
    const ds = buildDataset(s.name, s.headers, s.rows);
    const metric = ds.columns.find((c) => c.name === "Revenue");
    const byRegion = metric ? runQuery(ds, { metric: { op: "sum", column: metric.name }, groupBy: { column: "Region" }, sort: "desc" }).rows : [];
    return { ds, ov: buildOverview(ds, 2), byRegion, metric };
  }, [samples]);
  const k = preview.ov.kpis[0];

  return (
    <main className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[56rem] -translate-x-1/2 rounded-full bg-brand-300/30 blur-3xl" />
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12.5px] font-medium text-ink-700 shadow-card">
            <span className="size-1.5 rounded-full bg-brand-500" />Private by default · runs in your browser
          </span>
          <h1 className="mt-6 text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[56px]">
            Your spreadsheet already knows the answer.
            <span className="block text-ink-400">Just ask it.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[16.5px] leading-relaxed text-ink-600">
            Drop in a CSV export from your store, CRM or help desk. InsightDesk profiles every column, surfaces what changed and answers plain-English questions with charts you can pin to a dashboard.
          </p>
          <Dropzone
            multiple={false}
            accept={{ "text/csv": [".csv"], "text/plain": [".txt", ".tsv"] }}
            disabled={busy}
            onDrop={(accepted, rejected) => {
              const file = accepted[0];
              if (!file) return void toast.warning(rejected.length ? "That doesn’t look like a CSV file" : "No file selected");
              if (file.size > MAX_FILE_BYTES) return void toast.warning("Files must be under 30 MB");
              onFile(file);
            }}
          >
            {({ getRootProps, getInputProps, isDragActive }) => (
              <div
                {...getRootProps()}
                className={cn("mt-8 flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed bg-white/90 p-4 pr-5 transition", isDragActive ? "border-brand-500 ring-8 ring-brand-500/10" : "border-ink-300 hover:border-ink-950")}
              >
                <input {...getInputProps()} aria-label="Upload CSV" />
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-ink-950 text-white"><Upload className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{busy ? "Reading your file…" : isDragActive ? "Drop it" : "Drop a CSV or browse"}</span>
                  <span className="block text-[13px] text-ink-500">.csv or .tsv up to 30 MB. Nothing is uploaded.</span>
                </span>
                <ArrowRight className="size-5 text-ink-400" />
              </div>
            )}
          </Dropzone>
        </div>

        <div className="relative" aria-hidden>
          <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-brand-100 via-white to-white" />
          <div className="relative space-y-3 rounded-[22px] bg-white p-4 shadow-lift">
            <div className="flex items-center gap-2 px-1 text-[12px] text-ink-500"><FileSpreadsheet className="size-3.5" />{preview.ds.name}<span className="ml-auto font-mono">{preview.ds.rows.length} rows</span></div>
            <div className="grid grid-cols-2 gap-3">
              {preview.ov.kpis.map((kp) => (
                <div key={kp.column.name} className="rounded-xl bg-ink-50 p-3.5">
                  <div className="text-[12px] text-ink-500">{kp.op === "avg" ? "Avg" : "Total"} {kp.column.name.toLowerCase()}</div>
                  <div className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums">{formatNumber(kp.value, kp.column, true)}</div>
                  <div className="mt-2"><Sparkline values={kp.spark} up={kp.up} width={150} height={30} /></div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-ink-950 p-3.5 text-white">
              <div className="flex items-center gap-2 text-[13px]"><MessageSquareText className="size-4 text-brand-400" />Which region brings in the most revenue?</div>
              <div className="mt-3 space-y-1.5">
                {preview.byRegion.slice(0, 4).map((r, i) => (
                  <div key={r.label} className="flex items-center gap-2 text-[11.5px]">
                    <span className="w-24 truncate text-white/70">{r.label}</span>
                    <span className="h-2 flex-1 rounded-full bg-white/10"><span className={cn("block h-full rounded-full", i === 0 ? "bg-brand-400" : "bg-white/40")} style={{ width: `${(r.value / (preview.byRegion[0]?.value || 1)) * 100}%` }} /></span>
                    <span className="w-12 text-right font-mono text-white/60">{formatNumber(r.value, preview.metric, true)}</span>
                  </div>
                ))}
              </div>
            </div>
            {k?.delta && <div className="flex items-center gap-1.5 px-1 text-[12px] text-ink-500"><Sparkles className="size-3.5 text-brand-600" />{k.column.name} {k.up ? "up" : "down"} <b className={cn("font-semibold", k.up ? "text-brand-700" : "text-ink-950")}>{k.delta}</b> last month</div>}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="eyebrow">No file handy?</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Open a sample dataset</h2>
          </div>
          <span className="hidden items-center gap-1.5 text-[12.5px] text-ink-500 sm:flex"><Lock className="size-3.5" />Samples are synthetic</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {samples.map((s) => {
            const Icon = SAMPLE_ICON[s.id] ?? FileSpreadsheet;
            return (
              <button key={s.id} onClick={() => onSample(s)} className="group panel flex flex-col items-start p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className="flex w-full items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="size-5" /></span>
                  <ArrowUpRight className="size-4 text-ink-300 transition group-hover:text-ink-950" />
                </span>
                <span className="mt-4 font-mono text-[12.5px] font-medium text-ink-950">{s.name}</span>
                <span className="mt-1 text-[13px] leading-relaxed text-ink-500">{s.description}</span>
                <span className="mt-4 text-[11.5px] text-ink-400">{s.rows.length} rows · {s.headers.length} columns</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
