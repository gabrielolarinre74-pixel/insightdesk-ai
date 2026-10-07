"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Hash, Tag, Type } from "lucide-react";
import { histogram } from "@/lib/data/overview";
import { formatNumber, pct } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { ColumnProfile, ColumnType, Dataset } from "@/lib/data/types";

export const TYPE_ICON: Record<ColumnType, typeof Hash> = { number: Hash, date: Calendar, category: Tag, text: Type };
const fmtDate = (ms?: number) => (ms === undefined ? "–" : new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }));

function Profile({ c, ds }: { c: ColumnProfile; ds: Dataset }) {
  const filled = ds.rows.length ? c.count / ds.rows.length : 0;
  return (
    <div className="space-y-3 px-2.5 pb-3 pt-1 text-[12px]">
      <div>
        <div className="mb-1 flex justify-between text-ink-500"><span>Filled</span><span className="font-mono">{pct(c.count, ds.rows.length)}</span></div>
        <div className="h-1 overflow-hidden rounded-full bg-ink-100"><div className={cn("h-full rounded-full", filled > 0.95 ? "bg-brand-500" : "bg-amber-500")} style={{ width: `${filled * 100}%` }} /></div>
      </div>
      {c.type === "number" && (
        <>
          <div className="flex h-10 items-end gap-[2px]" aria-label="Distribution">
            {(() => {
              const h = histogram(ds, c, 16);
              const max = Math.max(...h.map((b) => b.count), 1);
              return h.map((b, i) => <span key={i} className="flex-1 rounded-[2px] bg-ink-950/80" style={{ height: `${Math.max(4, (b.count / max) * 100)}%` }} title={`${formatNumber(b.from, c, true)}–${formatNumber(b.to, c, true)}: ${b.count}`} />);
            })()}
          </div>
          <dl className="grid grid-cols-3 gap-2 font-mono text-[11px]">
            {[["min", c.min], ["avg", c.mean], ["max", c.max]].map(([k, v]) => (
              <div key={k as string}><dt className="text-ink-400">{k}</dt><dd className="truncate text-ink-800">{formatNumber(v as number, c, true)}</dd></div>
            ))}
          </dl>
        </>
      )}
      {c.type === "category" && c.top && (
        <ul className="space-y-1.5">
          {c.top.slice(0, 5).map((t) => (
            <li key={t.value}>
              <div className="flex justify-between gap-2"><span className="truncate text-ink-700">{t.value}</span><span className="font-mono text-ink-400">{t.count}</span></div>
              <div className="mt-0.5 h-1 rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(t.count / c.top![0].count) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
      {c.type === "date" && <div className="font-mono text-[11px] text-ink-700">{fmtDate(c.minDate)} → {fmtDate(c.maxDate)}</div>}
      {c.type === "text" && <div className="text-ink-500">{c.distinct.toLocaleString()} unique values</div>}
    </div>
  );
}

export function ColumnList({ dataset }: { dataset: Dataset }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="space-y-0.5">
      {dataset.columns.map((c) => {
        const Icon = TYPE_ICON[c.type];
        const isOpen = open === c.name;
        return (
          <li key={c.name} className={cn("rounded-lg transition", isOpen && "bg-ink-50")}>
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-ink-50" onClick={() => setOpen(isOpen ? null : c.name)} aria-expanded={isOpen}>
              <Icon className="size-3.5 shrink-0 text-ink-400" />
              <span className="min-w-0 flex-1 truncate text-ink-800">{c.name}</span>
              {c.missing > 0 && <span className="size-1.5 rounded-full bg-amber-500" title={`${c.missing} empty`} />}
              <span className="font-mono text-[10.5px] text-ink-400">{c.type === "category" ? c.distinct : c.type.slice(0, 3)}</span>
              <ChevronDown className={cn("size-3.5 text-ink-400 transition", isOpen && "rotate-180")} />
            </button>
            {isOpen && <Profile c={c} ds={dataset} />}
          </li>
        );
      })}
    </ul>
  );
}
