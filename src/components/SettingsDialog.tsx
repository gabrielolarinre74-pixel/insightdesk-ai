"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, FlaskConical, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { validateAi, type AiSettings } from "@/lib/ai";
import { cn } from "@/lib/utils";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Choose how questions are turned into queries.</DialogDescription>
        <div className="grid grid-cols-2 gap-2">
          {([["demo", FlaskConical, "Demo engine", "Offline. Built-in language parser."], ["ai", Sparkles, "AI model", "Any OpenAI-compatible API for open-ended questions."]] as const).map(([id, Icon, name, desc]) => (
            <button key={id} onClick={() => set("engine", id)} className={cn("rounded-xl border-2 p-3 text-left", draft.engine === id ? "border-emerald-500 bg-emerald-50" : "border-slate-200")}>
              <Icon className="mb-1 size-4 text-emerald-600" />
              <div className="text-sm font-semibold">{name}</div>
              <div className="text-xs text-slate-500">{desc}</div>
            </button>
          ))}
        </div>
        {draft.engine === "ai" && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">API key
              <div className="relative mt-1">
                <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm outline-none focus:border-emerald-400" type={show ? "text" : "password"} autoComplete="off" value={draft.apiKey} onChange={(e) => set("apiKey", e.target.value)} placeholder="sk-…" />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShow(!show)} aria-label="Toggle key visibility">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">API base URL
              <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" value={draft.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Model
              <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400" value={draft.model} onChange={(e) => set("model", e.target.value)} />
            </label>
            <p className="text-xs text-slate-500">Only column names, types and 3 sample rows are sent to the model. Queries run locally on your full data.</p>
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button onClick={save} className="w-full">Save</Button>
      </DialogContent>
    </Dialog>
  );
}
