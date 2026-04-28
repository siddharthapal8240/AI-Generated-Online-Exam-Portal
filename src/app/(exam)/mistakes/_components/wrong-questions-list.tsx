"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, MinusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WrongQuestion } from "@/server/data-access/wrong-questions";

export function WrongQuestionsList({
  questions,
}: {
  questions: WrongQuestion[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground sm:text-sm">
        {questions.length} question{questions.length !== 1 ? "s" : ""} to review
      </p>

      {questions.map((q, index) => {
        const isExpanded = expandedId === q.examQuestionId;
        const isWrong = !!q.selectedOption;

        const options = [
          { label: "A", text: q.optionA },
          { label: "B", text: q.optionB },
          { label: "C", text: q.optionC },
          { label: "D", text: q.optionD },
        ];

        return (
          <Card key={q.examQuestionId} className="overflow-hidden">
            {/* Collapsed view — always visible */}
            <button
              onClick={() =>
                setExpandedId(isExpanded ? null : q.examQuestionId)
              }
              className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/30 sm:p-4"
            >
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                {isWrong ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <MinusCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Question preview */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug sm:text-base">
                  {q.questionText.length > 120
                    ? q.questionText.slice(0, 120) + "..."
                    : q.questionText}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs"
                  >
                    {q.topicName}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] sm:text-xs",
                      q.difficulty === "EASY"
                        ? "bg-green-50 text-green-700"
                        : q.difficulty === "HARD"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {q.difficulty}
                  </Badge>
                  {q.source === "PYQ" && q.pyqSource && (
                    <Badge className="bg-purple-100 text-purple-800 text-[10px] sm:text-xs">
                      PYQ
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {q.examTitle}
                  </span>
                </div>
              </div>

              {/* Expand icon */}
              <div className="shrink-0 pt-1">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded view */}
            {isExpanded && (
              <CardContent className="border-t bg-muted/10 p-3 sm:p-4">
                {/* Full question */}
                <p className="mb-3 text-sm leading-relaxed">
                  {q.questionText}
                </p>

                {/* Options */}
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  {options.map((opt) => {
                    const isCorrectOpt = opt.label === q.correctOption;
                    const isUserChoice = opt.label === q.selectedOption;

                    return (
                      <div
                        key={opt.label}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                          isCorrectOpt && "border-green-400 bg-green-50",
                          isUserChoice &&
                            !isCorrectOpt &&
                            "border-red-400 bg-red-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            isCorrectOpt
                              ? "bg-green-500 text-white"
                              : isUserChoice
                                ? "bg-red-500 text-white"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {opt.label}
                        </span>
                        <span className="text-xs sm:text-sm">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Answer summary */}
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                  <span>
                    Your answer:{" "}
                    <strong className={isWrong ? "text-red-700" : "text-gray-500"}>
                      {q.selectedOption || "Skipped"}
                    </strong>
                  </span>
                  <span>
                    Correct:{" "}
                    <strong className="text-green-700">
                      {q.correctOption}
                    </strong>
                  </span>
                  <span>Time: {Math.round(q.timeSpentSec)}s</span>
                </div>

                {/* Solution */}
                {q.explanation && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-1 text-xs font-semibold text-amber-800">
                      Solution:
                    </p>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-amber-900 sm:text-sm">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
