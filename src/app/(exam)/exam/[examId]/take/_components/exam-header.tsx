"use client";

import { useExamSessionStore } from "@/stores/exam-session.store";
import { Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamHeaderProps {
  timer: {
    formatted: string;
    isWarning: boolean;
    isCritical: boolean;
    isDanger: boolean;
  };
  onSubmitClick: () => void;
}

export function ExamHeader({ timer, onSubmitClick }: ExamHeaderProps) {
  const { examTitle, totalQuestions, getAnsweredCount } =
    useExamSessionStore();

  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-slate-900 px-3 text-white sm:px-4">
      {/* Left: Title */}
      <h1 className="mr-2 min-w-0 truncate text-xs font-semibold sm:mr-3 sm:text-base">
        {examTitle}
      </h1>

      {/* Right: Answered + Timer + Submit */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Answered count */}
        <span className="hidden text-xs text-slate-300 sm:block">
          {getAnsweredCount()}/{totalQuestions}
        </span>

        {/* Timer */}
        <div
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 font-mono text-xs font-bold tabular-nums sm:gap-1.5 sm:rounded-md sm:px-3 sm:py-1.5 sm:text-base",
            timer.isDanger
              ? "animate-pulse bg-red-600 text-white"
              : timer.isCritical
                ? "bg-red-500/20 text-red-300"
                : timer.isWarning
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-800 text-slate-100",
          )}
        >
          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
          {timer.formatted}
        </div>

        {/* Submit — white bg so it stands out from timer */}
        <button
          onClick={onSubmitClick}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-100 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
        >
          <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          Submit
        </button>
      </div>
    </header>
  );
}
