"use client";

import { useExamSessionStore } from "@/stores/exam-session.store";
import { Button } from "@/components/ui/button";
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
      {/* Left: Title (truncates on small screens) */}
      <h1 className="mr-3 min-w-0 truncate text-sm font-semibold sm:text-base">
        {examTitle}
      </h1>

      {/* Right: Timer + Submit (always visible, never wraps) */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden text-xs text-slate-300 sm:block">
          {getAnsweredCount()}/{totalQuestions}
        </span>

        <div
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm font-bold tabular-nums sm:px-3 sm:py-1.5 sm:text-lg",
            timer.isDanger
              ? "animate-pulse bg-red-600 text-white"
              : timer.isCritical
                ? "bg-red-500/20 text-red-300"
                : timer.isWarning
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-800 text-slate-100",
          )}
        >
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {timer.formatted}
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={onSubmitClick}
          className="shrink-0 bg-red-600 px-3 hover:bg-red-700 sm:px-4"
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Submit</span>
          <span className="sm:hidden">End</span>
        </Button>
      </div>
    </header>
  );
}
