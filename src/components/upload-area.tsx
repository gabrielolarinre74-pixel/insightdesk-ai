"use client";

import Dropzone from "react-dropzone";
import { FileSpreadsheet, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MAX_FILE_BYTES } from "@/lib/data/load";
import type { SampleDataset } from "@/lib/data/samples";

interface UploadAreaProps {
  onFile: (file: File) => void;
  samples: SampleDataset[];
  onSample: (s: SampleDataset) => void;
  busy?: boolean;
}

export function UploadArea({ onFile, samples, onSample, busy }: UploadAreaProps) {
  return (
    <div className="w-full">
      <Dropzone
        multiple={false}
        accept={{ "text/csv": [".csv"], "text/plain": [".txt", ".tsv"] }}
        disabled={busy}
        onDrop={(accepted, rejected) => {
          const file = accepted[0];
          if (!file) return toast.warning(rejected.length ? "Please upload a CSV file" : "No file selected");
          if (file.size > MAX_FILE_BYTES) return toast.warning("File size must be less than 30 MB");
          onFile(file);
        }}
      >
        {({ getRootProps, getInputProps, isDragAccept }) => (
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white/80 px-6 py-12 text-center shadow-sm transition-all",
              isDragAccept ? "border-emerald-500 bg-emerald-50 ring-8 ring-emerald-100" : "border-slate-300 hover:border-emerald-400",
            )}
          >
            <input {...getInputProps()} aria-label="Upload CSV" />
            <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><UploadCloud className="size-7" /></div>
            <p className="text-lg font-semibold text-slate-900">{busy ? "Reading your file…" : "Drop a CSV here, or click to browse"}</p>
            <p className="mt-1 text-sm text-slate-500">Sales, leads, invoices, ad spend, inventory… up to 30 MB</p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="size-3.5" />Processed in your browser. Nothing is uploaded.</p>
          </div>
        )}
      </Dropzone>
      <div className="mt-5">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">or try a sample dataset</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {samples.map((s) => (
            <button key={s.id} onClick={() => onSample(s)} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
              <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{s.name}</span>
                <span className="block text-xs text-slate-500">{s.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
