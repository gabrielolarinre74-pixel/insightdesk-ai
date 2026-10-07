"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Calendar, Eye, FileDown, Hash, LayoutDashboard, Lightbulb, Loader2, MessagesSquare, Printer, RefreshCw, Settings, Tag, Type, TrendingUp, AlertTriangle, Trophy, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UploadArea } from "@/components/upload-area";
import { CsvPreviewModal } from "@/components/CsvPreviewModal";
import { AnswerCard, type Answer } from "@/components/AnswerCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { QuestionSuggestionCard } from "@/components/question-suggestion-card";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { buildDataset } from "@/lib/data/profile";
import { loadCsvFile } from "@/lib/data/load";
import { parseQuestion } from "@/lib/data/nl";
import { runQuery } from "@/lib/data/query";
import { narrate } from "@/lib/data/answer";
import { generateInsights, suggestQuestions, type Insight } from "@/lib/data/insights";
import { formatNumber } from "@/lib/data/format";
import { SAMPLES, type SampleDataset } from "@/lib/data/samples";
import { DEFAULT_AI, planWithAI, validateAi, type AiSettings } from "@/lib/ai";
import { cn, downloadFile } from "@/lib/utils";
import type { ColumnType, Dataset } from "@/lib/data/types";

const TYPE_ICON: Record<ColumnType, typeof Hash> = { number: Hash, date: Calendar, category: Tag, text: Type };
const INSIGHT_ICON: Record<Insight["kind"], typeof Hash> = { kpi: Gauge, leader: Trophy, trend: TrendingUp, outlier: AlertTriangle, quality: AlertTriangle };
const uid = () => Math.random().toString(36).slice(2, 10);

export default function Home() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [tab, setTab] = useState<"ask" | "dashboard">("ask");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [preview, setPreview] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useLocalStorage<AiSettings>("insightdesk-settings", DEFAULT_AI);
  const endRef = useRef<HTMLDivElement>(null);
  const samples = useMemo(() => SAMPLES.map((f) => f()), []);

  const insights = useMemo(() => (dataset ? generateInsights(dataset) : []), [dataset]);
  const suggestions = useMemo(() => (dataset ? suggestQuestions(dataset) : []), [dataset]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [answers.length]);

  const open = (ds: Dataset) => {
    setDataset(ds);
    setAnswers([]);
    setPinned([]);
    setTab("ask");
  };
  const onFile = async (file: File) => {
    setLoadingFile(true);
    try {
      const ds = await loadCsvFile(file);
      open(ds);
      toast.success(`Loaded ${ds.rows.length.toLocaleString()} rows from ${file.name}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingFile(false);
    }
  };
  const onSample = (s: SampleDataset) => open(buildDataset(s.name, s.headers, s.rows));

  const ask = async (q: string) => {
    const text = q.trim().slice(0, 500);
    if (!text || !dataset || busy) return;
    setQuestion("");
    setTab("ask");
    setBusy(true);
    const s = { ...DEFAULT_AI, ...settings };
    const useAi = s.engine === "ai" && !validateAi(s);
    let answer: Answer;
    try {
      let parsed = useAi ? null : parseQuestion(text, dataset);
      let engine: Answer["engine"] = "demo";
      if (useAi) {
        try {
          parsed = await planWithAI(text, dataset, s);
          engine = "ai";
        } catch (e) {
          toast.error(`${(e as Error).message} Falling back to the demo engine.`);
          parsed = parseQuestion(text, dataset);
        }
      }
      if (!parsed) {
        answer = { id: uid(), question: text, engine, error: true, text: "I couldn't match that question to your columns. Try naming a column, e.g. “total revenue by region” or “top 5 products by units”." };
      } else {
        const result = runQuery(dataset, parsed.plan);
        answer = { id: uid(), question: text, understanding: parsed.understanding, text: narrate(dataset, result), result, engine };
      }
    } catch (e) {
      answer = { id: uid(), question: text, engine: "demo", error: true, text: (e as Error).message };
    }
    setAnswers((a) => [...a, answer]);
    setBusy(false);
  };

  const togglePin = (id: string) => setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const pinnedAnswers = answers.filter((a) => pinned.includes(a.id));

  const exportReport = () => {
    if (!dataset) return;
    const list = pinnedAnswers.length ? pinnedAnswers : answers.filter((a) => a.result);
    const md = [
      `# Data report: ${dataset.name}`,
      `_${dataset.rows.length.toLocaleString()} rows · generated ${new Date().toLocaleString()} with InsightDesk_`,
      "",
      "## Key insights",
      ...insights.map((i) => `- **${i.title}**: ${i.detail}`),
      "",
      ...list.flatMap((a) => [
        `## ${a.question}`,
        "",
        a.text,
        "",
        ...(a.result && a.result.rows.length > 1 ? [`| ${a.result.groupLabel ?? "Label"} | ${a.result.metricLabel} |`, "|---|---:|", ...a.result.rows.map((r) => `| ${r.label} | ${formatNumber(r.value)} |`), ""] : []),
      ]),
    ].join("\n");
    downloadFile(`${dataset.name.replace(/\.\w+$/, "")}-report.md`, md, "text/markdown");
  };

  const logo = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.svg`;

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5">
          <button className="flex items-center gap-2.5" onClick={() => setDataset(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" className="size-9" />
            <span className="text-left leading-tight">
              <span className="block text-lg font-semibold tracking-tight">Insight<span className="text-emerald-600">Desk</span></span>
              <span className="block text-[11px] text-slate-500">by Gabriel.ATH</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className={cn("hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex", settings.engine === "ai" ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700")}>
              {settings.engine === "ai" ? `AI · ${settings.model}` : "Demo engine · no API key"}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings"><Settings /></Button>
          </div>
        </div>
      </header>

      {!dataset ? (
        <main className="mx-auto max-w-5xl px-5 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"><Sparkles className="size-3.5" />Chat with your spreadsheets</span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Ask your business data anything. <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">Get answers in seconds.</span></h1>
            <p className="mt-4 text-slate-600">Upload a CSV export from your shop, CRM or ad account. InsightDesk finds the trends for you, answers questions in plain English and builds a dashboard you can share.</p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl">
            <UploadArea onFile={onFile} samples={samples} onSample={onSample} busy={loadingFile} />
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { icon: Lightbulb, title: "Automatic insights", text: "Top performers, growth, unusual values and data gaps, the moment your file loads." },
              { icon: MessagesSquare, title: "Plain-English questions", text: "“Top 5 products by revenue in Europe” becomes a chart and a one-line answer." },
              { icon: ShieldCheck, title: "Private by design", text: "Everything runs in your browser. In AI mode only column names and 3 sample rows are shared." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                <Icon className="mb-2 size-5 text-emerald-600" />
                <div className="font-semibold">{title}</div>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[300px_1fr]">
          <aside className="no-print space-y-4 lg:sticky lg:top-22 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="truncate font-semibold" title={dataset.name}>{dataset.name}</div>
              <div className="text-xs text-slate-500">{dataset.rows.length.toLocaleString()} rows · {dataset.columns.length} columns</div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreview(true)}><Eye />Preview</Button>
                <Button size="sm" variant="outline" onClick={() => setDataset(null)}><RefreshCw />Change</Button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Columns</div>
              <ul className="space-y-1.5">
                {dataset.columns.map((c) => {
                  const Icon = TYPE_ICON[c.type];
                  return (
                    <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2"><Icon className="size-3.5 shrink-0 text-emerald-600" /><span className="truncate">{c.name}</span></span>
                      <span className="shrink-0 text-[11px] text-slate-400">{c.type === "number" ? (c.percent ? `avg ${formatNumber(c.mean ?? 0, c)}` : `Σ ${formatNumber(c.sum ?? 0, c, true)}`) : c.type === "category" ? `${c.distinct} values` : c.type}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {insights.map((i) => {
                const Icon = INSIGHT_ICON[i.kind];
                return (
                  <button
                    key={i.title}
                    disabled={!i.question}
                    onClick={() => i.question && ask(i.question)}
                    className={cn("group rounded-2xl border border-slate-200 bg-white p-4 text-left transition", i.question && "hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md")}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400"><Icon className={cn("size-4", i.kind === "outlier" || i.kind === "quality" ? "text-amber-500" : "text-emerald-600")} />{i.kind === "kpi" ? "Key metric" : i.kind}</div>
                    <div className="font-semibold leading-snug text-slate-900">{i.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{i.detail}</p>
                  </button>
                );
              })}
            </div>

            <div className="no-print mb-4 flex items-center justify-between">
              <div className="inline-flex rounded-xl bg-slate-200/60 p-1">
                <button onClick={() => setTab("ask")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500", tab === "ask" && "bg-white text-slate-900 shadow-sm")}><MessagesSquare className="size-4" />Ask</button>
                <button onClick={() => setTab("dashboard")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500", tab === "dashboard" && "bg-white text-slate-900 shadow-sm")}><LayoutDashboard className="size-4" />Dashboard{pinned.length ? ` (${pinned.length})` : ""}</button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportReport} disabled={!answers.some((a) => a.result)}><FileDown />Report</Button>
                <Button size="sm" variant="outline" onClick={() => { setTab("dashboard"); setTimeout(() => window.print(), 300); }} disabled={!pinned.length}><Printer />Print</Button>
              </div>
            </div>

            {tab === "ask" ? (
              <div className="space-y-4 pb-36">
                {answers.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6">
                    <p className="mb-3 text-sm font-medium text-slate-600">Try one of these questions:</p>
                    <div className="flex flex-col gap-2">
                      {suggestions.map((q) => <QuestionSuggestionCard key={q} question={q} onClick={() => ask(q)} />)}
                    </div>
                  </div>
                )}
                {answers.map((a) => <AnswerCard key={a.id} answer={a} dataset={dataset} pinned={pinned.includes(a.id)} onPin={a.result ? () => togglePin(a.id) : undefined} />)}
                {busy && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Crunching the numbers…</div>}
                <div ref={endRef} />
              </div>
            ) : (
              <div className="pb-10">
                <div className="mb-4 hidden print:block">
                  <h1 className="text-2xl font-semibold">{dataset.name}: dashboard</h1>
                  <p className="text-sm text-slate-500">Generated with InsightDesk</p>
                </div>
                {pinnedAnswers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-500">Pin answers from the Ask tab to build a dashboard you can print or export.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pinnedAnswers.map((a) => <AnswerCard key={a.id} answer={a} dataset={dataset} compact pinned onPin={() => togglePin(a.id)} />)}
                  </div>
                )}
              </div>
            )}
          </section>

          {tab === "ask" && (
            <form
              className="no-print fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#f6f8f7] via-[#f6f8f7] to-transparent pb-5 pt-8"
              onSubmit={(e) => { e.preventDefault(); ask(question); }}
            >
              <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-lg lg:ml-[calc(50%-14rem)]">
                <input
                  className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
                  placeholder={`Ask about ${dataset.name}… e.g. "${suggestions[0] ?? "total by category"}"`}
                  value={question}
                  maxLength={500}
                  onChange={(e) => setQuestion(e.target.value)}
                  aria-label="Ask a question"
                />
                <Button type="submit" size="icon" disabled={!question.trim() || busy} aria-label="Ask"><ArrowUp /></Button>
              </div>
            </form>
          )}

          <CsvPreviewModal open={preview} onOpenChange={setPreview} headers={dataset.columns.map((c) => c.name)} rows={dataset.rows.slice(0, 50)} />
        </main>
      )}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={{ ...DEFAULT_AI, ...settings }} onSave={setSettings} />
    </div>
  );
}
