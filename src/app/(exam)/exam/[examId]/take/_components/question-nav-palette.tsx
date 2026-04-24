"use client";

import {
  useExamSessionStore,
  type QuestionNavStatus,
} from "@/stores/exam-session.store";
import { cn } from "@/lib/utils";
import { QUESTION_STATUS_COLORS } from "@/lib/constants";

const statusLabels: Record<QuestionNavStatus, string> = {
  NOT_VISITED: "Not Visited",
  VISITED: "Not Answered",
  ANSWERED: "Answered",
  MARKED_FOR_REVIEW: "Marked for Review",
  ANSWERED_AND_MARKED: "Answered & Marked",
};

export function QuestionNavPalette() {
  const {
    questions,
    currentQuestionIndex,
    navigateTo,
    getAnsweredCount,
    getNotVisitedCount,
    getMarkedCount,
  } = useExamSessionStore();

  const notAnswered = questions.filter((q) => q.status === "VISITED").length;

  return (
    <aside className="hidden w-72 flex-col border-l bg-muted/20 lg:flex">
      {/* Legend */}
      <div className="border-b p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Legend
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            Object.entries(QUESTION_STATUS_COLORS) as [
              QuestionNavStatus,
              (typeof QUESTION_STATUS_COLORS)[keyof typeof QUESTION_STATUS_COLORS],
            ][]
          ).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-3 w-3 rounded-sm border",
                  colors.bg,
                  colors.border,
                )}
              />
              <span className="text-[10px] text-muted-foreground">
                {statusLabels[status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Question grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, index) => {
            const colors =
              QUESTION_STATUS_COLORS[q.status] ||
              QUESTION_STATUS_COLORS.NOT_VISITED;
            const isCurrent = index === currentQuestionIndex;

            return (
              <button
                key={q.examQuestionId}
                onClick={() => navigateTo(index)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md border text-xs font-semibold transition-all",
                  colors.bg,
                  colors.border,
                  colors.text,
                  isCurrent && "ring-2 ring-slate-900 ring-offset-1",
                )}
                title={`Q${q.sequenceNumber} - ${statusLabels[q.status]}`}
              >
                {q.sequenceNumber}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="border-t p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </p>
        <div className="grid grid-cols-2 gap-y-1 text-xs">
          <span className="text-muted-foreground">Answered:</span>
          <span className="font-medium text-green-700">
            {getAnsweredCount()}
          </span>
          <span className="text-muted-foreground">Not Answered:</span>
          <span className="font-medium text-red-700">{notAnswered}</span>
          <span className="text-muted-foreground">Not Visited:</span>
          <span className="font-medium text-gray-600">
            {getNotVisitedCount()}
          </span>
          <span className="text-muted-foreground">Marked:</span>
          <span className="font-medium text-purple-700">
            {getMarkedCount()}
          </span>
        </div>
      </div>
    </aside>
  );
}
