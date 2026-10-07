"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function QuestionSuggestionCard({
  question,
  onClick,
  isLoading,
}: {
  question: string;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  return (
    <Card
      className={cn(
        isLoading ? "animate-pulse" : "",
        onClick ? "cursor-pointer" : "",
        "flex justify-start items-start overflow-hidden gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border-[0.7px] border-[#cad5e2] w-full text-left hover:border-emerald-300 hover:bg-white transition"
      )}
      onClick={onClick && onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}${isLoading ? "/loading.svg" : "/suggestion.svg"}`}
            alt="suggestion"
            className={cn(isLoading ? "animate-spin" : "", "size-[18px]")}
          />
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{question}</p>
      </div>
    </Card>
  );
}
