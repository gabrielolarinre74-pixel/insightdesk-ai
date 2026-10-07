"use client";

import { useEffect, useState } from "react";
import { Cpu, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { validateAi, type AiSettings } from "@/lib/ai";
import { cn } from "@/lib/utils";

const ENGINES = [
  { id: "demo", icon: Cpu, name: "Built-in parser", desc: "Runs offline. Understands totals, averages, rankings, trends and filters." },
  { id: "ai", icon: Sparkles, name: "AI model", desc: "Any OpenAI-compatible API plans the query for open-ended questions." },
] as const;

export function SettingsDialog({ open, onOpenChange, settings, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; settings: AiSettings; onSave: (s: AiSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setDraft(settings); setError(""); } }, [open, settings]);
  const set = <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => setDraft({ ...draft, [k]: v });

  const save = () => {
    const p = validateAi(draft);
    if (p) return setError(p);
    onSave({ ...draft, apiKey: draft.apiKey.trim() });
    toast.success("Settings saved");
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Choose how questions become queries. Queries always run locally."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Save changes</Button></>}
    >
      <span className="label">Query engine</span>
      <div className="grid grid-cols-2 gap-2.5">
        {ENGINES.map(({ id, icon: Icon, name, desc }) => (
          <button key={id} onClick={() => set("engine", id)} aria-pressed={draft.engine === id} className={cn("rounded-xl p-4 text-left transition", draft.engine === id ? "bg-white ring-2 ring-brand-500" : "shadow-card hover:bg-ink-50")}>
            <span className={cn("mb-3 grid size-8 place-items-center rounded-lg", draft.engine === id ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600")}><Icon className="size-4" /></span>
            <div className="text-sm font-semibold">{name}</div>
            <div className="mt-0.5 text-xs leading-snug text-ink-500">{desc}</div>
          </button>
        ))}
      </div>
      {draft.engine === "ai" && (
        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="key">API key</label>
            <div className="relative">
              <input id="key" className="field pr-10 font-mono" type={show ? "text" : "password"} autoComplete="off" value={draft.apiKey} onChange={(e) => set("apiKey", e.target.value)} placeholder="sk-…" />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700" onClick={() => setShow(!show)} aria-label="Toggle key visibility">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_160px] gap-3">
            <div>
              <label className="label" htmlFor="url">Base URL</label>
              <input id="url" className="field font-mono" value={draft.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="model">Model</label>
              <input id="model" className="field font-mono" value={draft.model} onChange={(e) => set("model", e.target.value)} />
            </div>
          </div>
          <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs leading-relaxed text-brand-800">Only column names, types and three sample rows are sent. The model returns a query plan that is validated, then run on your full data in the browser.</p>
        </div>
      )}
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
    </Modal>
  );
}
