"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TYPE_ICON } from "@/components/ColumnList";
import { paginate, searchRows, sortRows, toCsv, type SortDir } from "@/lib/data/table";
import { cn, downloadFile } from "@/lib/utils";
import type { Dataset } from "@/lib/data/types";

const PAGE = 25;

export function DataTable({ dataset }: { dataset: Dataset }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: SortDir } | null>(null);
  const [page, setPage] = useState(1);
  const headers = dataset.columns.map((c) => c.name);

  const view = useMemo(() => {
    let rows = searchRows(dataset.rows, query, headers);
    const c = sort && dataset.columns.find((x) => x.name === sort.col);
    if (c) rows = sortRows(rows, c, sort!.dir);
    return rows;
  }, [dataset, query, sort, headers]);
  const pg = paginate(view, page, PAGE);

  const toggleSort = (col: string) => {
    setPage(1);
    setSort((s) => (s?.col !== col ? { col, dir: "desc" } : s.dir === "desc" ? { col, dir: "asc" } : null));
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input className="field h-9 py-0 pl-9" placeholder="Search all cells" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Search rows" />
        </div>
        <span className="text-[13px] text-ink-500"><b className="font-semibold text-ink-950 tabular-nums">{view.length.toLocaleString()}</b> of {dataset.rows.length.toLocaleString()} rows</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => downloadFile(dataset.name.replace(/\.\w+$/, "") + (query ? "-filtered" : "") + ".csv", toCsv(headers, view), "text/csv")}><Download />Export view</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/70">
              {dataset.columns.map((c) => {
                const Icon = TYPE_ICON[c.type];
                const active = sort?.col === c.name;
                return (
                  <th key={c.name} className={cn("whitespace-nowrap px-4 py-2.5 text-left font-medium", c.type === "number" && "text-right")}>
                    <button onClick={() => toggleSort(c.name)} className={cn("inline-flex items-center gap-1.5 text-ink-600 hover:text-ink-950", active && "text-ink-950")} aria-label={`Sort by ${c.name}`}>
                      <Icon className="size-3.5 text-ink-400" />{c.name}
                      {active && (sort!.dir === "desc" ? <ArrowDown className="size-3.5 text-brand-600" /> : <ArrowUp className="size-3.5 text-brand-600" />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pg.items.map((r, i) => (
              <tr key={i} className="hover:bg-brand-50/40">
                {dataset.columns.map((c) => {
                  const v = r[c.name] ?? "";
                  return (
                    <td key={c.name} className={cn("whitespace-nowrap px-4 py-2", c.type === "number" && "text-right font-mono tabular-nums", c.type === "date" && "font-mono text-ink-600")}>
                      {v === "" ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">empty</span> : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!pg.items.length && <div className="p-12 text-center text-sm text-ink-500">No rows match “{query}”.</div>}
      </div>
      <div className="flex items-center justify-between border-t border-ink-100 px-4 py-2.5 text-[12.5px] text-ink-500">
        <span>Page {pg.page} of {pg.pages}</span>
        <div className="flex gap-1">
          <Button size="icon-sm" variant="ghost" disabled={pg.page <= 1} onClick={() => setPage(pg.page - 1)} aria-label="Previous page"><ChevronLeft /></Button>
          <Button size="icon-sm" variant="ghost" disabled={pg.page >= pg.pages} onClick={() => setPage(pg.page + 1)} aria-label="Next page"><ChevronRight /></Button>
        </div>
      </div>
    </div>
  );
}
