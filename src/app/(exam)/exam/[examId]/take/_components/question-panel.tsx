"use client";

import { useExamSessionStore } from "@/stores/exam-session.store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, X, Bookmark } from "lucide-react";
import { useAnswerSync } from "@/lib/hooks/use-answer-sync";

export function QuestionPanel() {
  const {
    questions,
    currentQuestionIndex,
    navigateTo,
    selectOption,
    toggleMarkForReview,
    clearResponse,
    sessionId,
  } = useExamSessionStore();
  const { saveAnswer } = useAnswerSync(sessionId);

  const currentQ = questions[currentQuestionIndex];
  if (!currentQ) return null;

  const options = [
    { label: "A", text: currentQ.optionA },
    { label: "B", text: currentQ.optionB },
    { label: "C", text: currentQ.optionC },
    { label: "D", text: currentQ.optionD },
  ];

  function handleSelectOption(option: string) {
    selectOption(option);
    // Fire and forget save
    saveAnswer({
      examQuestionId: currentQ.examQuestionId,
      selectedOption: option,
      status: currentQ.markedForReview ? "ANSWERED_AND_MARKED" : "ANSWERED",
      timeSpentSec: currentQ.timeSpentSec,
    });
  }

  function handleSaveAndNext() {
    if (currentQuestionIndex < questions.length - 1) {
      navigateTo(currentQuestionIndex + 1);
    }
  }

  function handlePrevious() {
    if (currentQuestionIndex > 0) {
      navigateTo(currentQuestionIndex - 1);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 p-4 sm:p-6">
        {/* Question number */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Question {currentQ.sequenceNumber} of {questions.length}
          </span>
          <button
            onClick={() => {
              toggleMarkForReview();
              saveAnswer({
                examQuestionId: currentQ.examQuestionId,
                selectedOption: currentQ.selectedOption,
                status: currentQ.markedForReview
                  ? currentQ.selectedOption
                    ? "ANSWERED"
                    : "VISITED"
                  : currentQ.selectedOption
                    ? "ANSWERED_AND_MARKED"
                    : "MARKED_FOR_REVIEW",
                timeSpentSec: currentQ.timeSpentSec,
              });
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              currentQ.markedForReview
                ? "bg-purple-100 text-purple-800"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <Bookmark
              className={cn(
                "h-4 w-4",
                currentQ.markedForReview && "fill-current",
              )}
            />
            {currentQ.markedForReview ? "Marked" : "Mark for Review"}
          </button>
        </div>

        {/* Question text */}
        <div className="mb-6 rounded-lg border bg-card p-4">
          <p className="text-base leading-relaxed">{currentQ.questionText}</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleSelectOption(opt.label)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
                currentQ.selectedOption === opt.label
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30 hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  currentQ.selectedOption === opt.label
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {opt.label}
              </span>
              <span className="pt-0.5 text-sm">{opt.text}</span>
            </button>
          ))}
        </div>

        {/* Clear response */}
        {currentQ.selectedOption && (
          <button
            onClick={() => {
              clearResponse();
              saveAnswer({
                examQuestionId: currentQ.examQuestionId,
                selectedOption: null,
                status: currentQ.markedForReview
                  ? "MARKED_FOR_REVIEW"
                  : "VISITED",
                timeSpentSec: currentQ.timeSpentSec,
              });
            }}
            className="mt-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear Response
          </button>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t bg-background p-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Previous
        </Button>
        <Button
          onClick={handleSaveAndNext}
          disabled={currentQuestionIndex === questions.length - 1}
        >
          Save & Next
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
