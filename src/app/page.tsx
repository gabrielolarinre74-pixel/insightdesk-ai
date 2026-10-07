"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Cpu, FileDown, FolderOpen, LayoutDashboard, LayoutGrid, Loader2, MessageSquareText, Printer, Settings, Sparkles, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Landing } from "@/components/Landing";
import { Overview } from "@/components/Overview";
import { AnswerCard, type Answer } from "@/components/AnswerCard";
import { DataTable } from "@/components/DataTable";
import { ColumnList } from "@/components/ColumnList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { buildDataset } from "@/lib/data/profile";
import { loadCsvFile } from "@/lib/data/load";
import { parseQuestion } from "@/lib/data/nl";
import { runQuery } from "@/lib/data/query";
import { narrate } from "@/lib/data/answer";
import { generateInsights, suggestQuestions } from "@/lib/data/insights";
import { buildOverview } from "@/lib/data/overview";
import { formatNumber } from "@/lib/data/format";
import { SAMPLES, type SampleDataset } from "@/lib/data/samples";
import { DEFAULT_AI, planWithAI, validateAi, type AiSettings } from "@/lib/ai";
import { cn, downloadFile } from "@/lib/utils";
import type { Dataset } from "@/lib/data/types";

type Tab = "overview" | "ask" | "dashboard" | "data";
const uid = () => Math.random().toString(36).slice(2, 10);

export default function Home() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useLocalStorage<AiSettings>("insightdesk-settings", DEFAULT_AI);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const samples = useMemo(() => SAMPLES.map((f) => f()), []);

  const insights = useMemo(() => (dataset ? generateInsights(dataset) : []), [dataset]);
  const suggestions = useMemo(() => (dataset ? suggestQuestions(dataset) : []), [dataset]);
  const overview = useMemo(() => (dataset ? buildOverview(dataset) : null), [dataset]);

  useEffect(() => { if (tab === "ask") endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [answers.length, tab]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!dataset || (e.target as HTMLElement).closest("input, textarea, [role=dialog]")) return;
      if (e.key === "/") { e.preventDefault(); setTab("ask"); setTimeout(() => inputRef.current?.focus(), 0); }
      const map: Record<string, Tab> = { "1": "overview", "2": "ask", "3": "dashboard", "4": "data" };
      if (map[e.key]) setTab(map[e.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dataset]);

  const open = (ds: Dataset) => {
    setDataset(ds);
    setAnswers([]);
    setPinned([]);
    setTab("overview");
    window.scrollTo({ top: 0 });
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
          toast.error(`${(e as Error).message} Using the built-in parser instead.`);
          parsed = parseQuestion(text, dataset);
        }
      }
      if (!parsed) {
        answer = { id: uid(), question: text, engine, error: true, text: "I couldn't match that to your columns. Try naming one, for example “total revenue by region” or “top 5 products by units”." };
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
      `# ${dataset.name}`,
      `_${dataset.rows.length.toLocaleString()} rows · ${new Date().toLocaleString()}_`,
      "",
      "## Highlights",
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
  const aiOn = settings.engine === "ai";
  const NAV = [
    { id: "overview" as const, label: "Overview", icon: LayoutGrid },
    { id: "ask" as const, label: "Ask", icon: MessageSquareText, count: answers.length || undefined },
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, count: pinned.length || undefined },
    { id: "data" as const, label: "Data", icon: Table2 },
  ];
  const TITLES: Record<Tab, [string, string]> = {
    overview: ["Overview", "Headline numbers and what changed, computed on load."],
    ask: ["Ask", "Plain-English questions, answered from every row."],
    dashboard: ["Dashboard", "Answers you pinned, ready to print or export."],
    data: ["Data", "Every row, sortable and searchable."],
  };

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-ink-200/70 bg-white/80 backdrop-blur-xl">
        <div className={cn("flex h-14 items-center justify-between gap-3 px-5", !dataset && "mx-auto max-w-6xl px-6")}>
          <div className="flex min-w-0 items-center gap-3">
            <button className="flex items-center gap-2.5" onClick={() => setDataset(null)} aria-label="Home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="size-7" />
              <span className="text-[15px] font-semibold tracking-tight">InsightDesk</span>
            </button>
            {dataset && <><span className="text-ink-300">/</span><span className="truncate font-mono text-[13px] text-ink-600">{dataset.name}</span></>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSettingsOpen(true)} className="hidden h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-ink-600 shadow-card hover:bg-ink-50 sm:inline-flex">
              {aiOn ? <Sparkles className="size-3.5 text-brand-600" /> : <Cpu className="size-3.5 text-brand-600" />}
              {aiOn ? settings.model : "Built-in parser"}
            </button>
            <Button variant="ghost" size="icon-sm" onClick={() => setSettingsOpen(true)} aria-label="Settings"><Settings /></Button>
            <span className="hidden text-[11.5px] text-ink-400 md:inline">by Gabriel.ATH</span>
          </div>
        </div>
      </header>

      {!dataset ? (
        <Landing samples={samples} onFile={onFile} onSample={onSample} busy={loadingFile} />
      ) : (
        <div className="grid lg:grid-cols-[272px_minmax(0,1fr)]">
          <aside className="no-print border-r border-ink-200/70 bg-ink-50/60 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
            <div className="p-4">
              <div className="panel p-3.5">
                <div className="truncate font-mono text-[12.5px] font-medium" title={dataset.name}>{dataset.name}</div>
                <div className="mt-0.5 text-[12px] text-ink-500">{dataset.rows.length.toLocaleString()} rows · {dataset.columns.length} columns</div>
                <Button size="sm" variant="subtle" className="mt-3 w-full" onClick={() => setDataset(null)}><FolderOpen />Open another file</Button>
              </div>
              <nav className="mt-4 space-y-0.5" aria-label="Sections">
                {NAV.map(({ id, label, icon: Icon, count }, i) => (
                  <button key={id} onClick={() => setTab(id)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition", tab === id ? "bg-white text-ink-950 shadow-card" : "text-ink-600 hover:bg-white/70")}>
                    <Icon className={cn("size-4", tab === id ? "text-brand-600" : "text-ink-400")} />
                    <span className="flex-1 text-left">{label}</span>
                    {count ? <span className="rounded-md bg-ink-950 px-1.5 font-mono text-[10.5px] leading-[18px] text-white">{count}</span> : <span className="kbd">{i + 1}</span>}
                  </button>
                ))}
              </nav>
              <div className="eyebrow mb-2 mt-6 px-2.5">Columns</div>
              <ColumnList dataset={dataset} />
            </div>
          </aside>

          <main className="min-w-0 px-5 py-6 lg:px-8">
            <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight">{TITLES[tab][0]}</h1>
                <p className="text-[13.5px] text-ink-500">{TITLES[tab][1]}</p>
              </div>
              {(tab === "ask" || tab === "dashboard") && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportReport} disabled={!answers.some((a) => a.result)}><FileDown />Markdown report</Button>
                  <Button size="sm" variant="outline" onClick={() => { setTab("dashboard"); setTimeout(() => window.print(), 300); }} disabled={!pinned.length}><Printer />Print</Button>
                </div>
              )}
            </div>

            {tab === "overview" && overview && <Overview dataset={dataset} overview={overview} insights={insights} onAsk={ask} />}

            {tab === "ask" && (
              <div className="mx-auto max-w-3xl pb-32">
                {answers.length === 0 && (
                  <div className="panel p-6">
                    <div className="flex items-center gap-2 text-[15px] font-semibold"><MessageSquareText className="size-4 text-brand-600" />Start with a question</div>
                    <p className="mt-1 text-[13px] text-ink-500">Name a column, a breakdown or a filter. Press <span className="kbd">/</span> anywhere to jump here.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {suggestions.map((q) => (
                        <button key={q} onClick={() => ask(q)} className="rounded-full bg-ink-100 px-3.5 py-1.5 text-[13px] text-ink-800 transition hover:bg-ink-950 hover:text-white">{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {answers.map((a) => <AnswerCard key={a.id} answer={a} dataset={dataset} pinned={pinned.includes(a.id)} onPin={a.result ? () => togglePin(a.id) : undefined} />)}
                </div>
                {busy && <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-500"><Loader2 className="size-4 animate-spin" />Working it out…</div>}
                <div ref={endRef} />
                <form className="no-print fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-white via-white/95 to-transparent pb-5 pt-10 lg:left-[272px]" onSubmit={(e) => { e.preventDefault(); ask(question); }}>
                  <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl bg-white p-2 pl-4 shadow-lift">
                    <MessageSquareText className="size-4 shrink-0 text-ink-400" />
                    <input
                      ref={inputRef}
                      className="flex-1 bg-transparent py-2 text-[14px] outline-none placeholder:text-ink-400"
                      placeholder={`Ask anything, e.g. “${suggestions[0] ?? "total by category"}”`}
                      value={question}
                      maxLength={500}
                      onChange={(e) => setQuestion(e.target.value)}
                      aria-label="Ask a question"
                    />
                    <Button type="submit" variant="brand" size="icon" disabled={!question.trim() || busy} aria-label="Ask"><ArrowUp /></Button>
                  </div>
                </form>
              </div>
            )}

            {tab === "dashboard" && (
              <div className="pb-10">
                <div className="mb-4 hidden print:block">
                  <h1 className="text-2xl font-semibold">{dataset.name}</h1>
                </div>
                {pinnedAnswers.length === 0 ? (
                  <div className="panel grid-bg p-14 text-center">
                    <LayoutDashboard className="mx-auto size-6 text-ink-400" />
                    <div className="mt-3 font-semibold">Nothing pinned yet</div>
                    <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-500">Pin answers from Ask to build a one-page dashboard you can print or export as Markdown.</p>
                    <Button size="sm" className="mt-4" onClick={() => setTab("ask")}>Go to Ask</Button>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {pinnedAnswers.map((a) => <AnswerCard key={a.id} answer={a} dataset={dataset} compact pinned onPin={() => togglePin(a.id)} />)}
                  </div>
                )}
              </div>
            )}

            {tab === "data" && <DataTable dataset={dataset} />}
          </main>
        </div>
      )}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={{ ...DEFAULT_AI, ...settings }} onSave={setSettings} />
    </div>
  );
}
