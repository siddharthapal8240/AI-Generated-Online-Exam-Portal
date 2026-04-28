"use client";

import { useState } from "react";
import {
  useExamSessionStore,
  type QuestionNavStatus,
} from "@/stores/exam-session.store";
import { useAnswerSync } from "@/lib/hooks/use-answer-sync";
import { cn } from "@/lib/utils";
import { QUESTION_STATUS_COLORS } from "@/lib/constants";
import { LayoutGrid, X, ChevronUp } from "lucide-react";

const statusLabels: Record<QuestionNavStatus, string> = {
  NOT_VISITED: "Not Visited",
  VISITED: "Not Answered",
  ANSWERED: "Answered",
  MARKED_FOR_REVIEW: "Marked for Review",
  ANSWERED_AND_MARKED: "Answered & Marked",
};

function QuestionGrid({ onSelect }: { onSelect?: () => void }) {
  const {
    questions,
    currentQuestionIndex,
    navigateTo,
    getAnsweredCount,
    getNotVisitedCount,
    getMarkedCount,
    sessionId,
  } = useExamSessionStore();
  const { saveAnswer } = useAnswerSync(sessionId);

  const notAnswered = questions.filter((q) => q.status === "VISITED").length;

  return (
    <div className="flex flex-col">
      {/* Legend */}
      <div className="border-b p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Question Status
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {(
            Object.entries(QUESTION_STATUS_COLORS) as [
              QuestionNavStatus,
              (typeof QUESTION_STATUS_COLORS)[keyof typeof QUESTION_STATUS_COLORS],
            ][]
          ).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-3.5 w-3.5 shrink-0 rounded-sm border",
                  colors.bg,
                  colors.border,
                )}
              />
              <span className="text-[11px] text-muted-foreground">
                {statusLabels[status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Question grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-8 gap-2 sm:grid-cols-10 lg:grid-cols-5">
          {questions.map((q, index) => {
            const colors =
              QUESTION_STATUS_COLORS[q.status] ||
              QUESTION_STATUS_COLORS.NOT_VISITED;
            const isCurrent = index === currentQuestionIndex;

            return (
              <button
                key={q.examQuestionId}
                onClick={() => {
                  // Sync current question time before jumping
                  const store = useExamSessionStore.getState();
                  const curr = store.questions[store.currentQuestionIndex];
                  if (curr) {
                    const enteredAt = store.questionEnteredAt;
                    const elapsed = enteredAt > 0 ? Math.max(0, (Date.now() - enteredAt) / 1000) : 0;
                    saveAnswer({
                      examQuestionId: curr.examQuestionId,
                      selectedOption: curr.selectedOption,
                      status: curr.status === "NOT_VISITED" ? "VISITED" : curr.status,
                      timeSpentSec: curr.timeSpentSec + elapsed,
                    });
                  }
                  navigateTo(index);
                  onSelect?.();
                }}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-all",
                  colors.bg,
                  colors.border,
                  colors.text,
                  isCurrent && "ring-2 ring-slate-900 ring-offset-2",
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
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-green-700">{getAnsweredCount()}</p>
            <p className="text-[10px] text-muted-foreground">Answered</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-700">{notAnswered}</p>
            <p className="text-[10px] text-muted-foreground">Not Answered</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-600">{getNotVisitedCount()}</p>
            <p className="text-[10px] text-muted-foreground">Not Visited</p>
          </div>
          <div>
            <p className="text-lg font-bold text-purple-700">{getMarkedCount()}</p>
            <p className="text-[10px] text-muted-foreground">Marked</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuestionNavPalette() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — always visible on large screens */}
      <aside className="hidden w-72 flex-col border-l bg-muted/20 lg:flex">
        <QuestionGrid />
      </aside>

      {/* Mobile/Tablet floating button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 lg:hidden"
      >
        <LayoutGrid className="h-6 w-6" />
      </button>

      {/* Mobile/Tablet slide-up drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t bg-background shadow-2xl lg:hidden">
            {/* Handle + Close */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-background p-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Question Navigator</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <QuestionGrid onSelect={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
