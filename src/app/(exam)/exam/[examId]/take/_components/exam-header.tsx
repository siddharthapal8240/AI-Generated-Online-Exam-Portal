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
    <header className="flex h-14 items-center justify-between border-b bg-slate-900 px-4 text-white">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold sm:text-base">{examTitle}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-slate-300 sm:block">
          {getAnsweredCount()}/{totalQuestions} answered
        </span>
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-lg font-bold tabular-nums",
            timer.isDanger
              ? "animate-pulse bg-red-600 text-white"
              : timer.isCritical
                ? "bg-red-500/20 text-red-300"
                : timer.isWarning
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-800 text-slate-100",
          )}
        >
          <Clock className="h-4 w-4" />
          {timer.formatted}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onSubmitClick}
          className="bg-red-600 hover:bg-red-700"
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          Submit
        </Button>
      </div>
    </header>
  );
}
