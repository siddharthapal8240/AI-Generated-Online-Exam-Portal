"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { deleteQuestionAction } from "@/server/actions/question.actions";

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-100 text-green-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HARD: "bg-red-100 text-red-800",
};

const sourceColors: Record<string, string> = {
  MANUAL: "bg-gray-100 text-gray-800",
  AI_GENERATED: "bg-blue-100 text-blue-800",
  PYQ: "bg-purple-100 text-purple-800",
};

interface QuestionTableProps {
  questions: any[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export function QuestionTable({
  questions,
  totalCount,
  page,
  totalPages,
}: QuestionTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (questions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Answer</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <>
                <TableRow
                  key={q.id}
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === q.id ? null : q.id)
                  }
                >
                  <TableCell>
                    {expandedId === q.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="max-w-md truncate font-medium">
                    {q.questionText.length > 80
                      ? q.questionText.slice(0, 80) + "..."
                      : q.questionText}
                  </TableCell>
                  <TableCell className="text-sm">
                    {q.topic?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={difficultyColors[q.difficulty] || ""}
                    >
                      {q.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={sourceColors[q.source] || ""}
                    >
                      {q.source.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{q.correctOption}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("Delete this question?")) {
                          await deleteQuestionAction(q.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedId === q.id && (
                  <TableRow key={`${q.id}-expanded`}>
                    <TableCell colSpan={7} className="bg-muted/30">
                      <div className="space-y-3 p-4">
                        <div>
                          <p className="text-sm font-medium">Full Question:</p>
                          <p className="text-sm">{q.questionText}</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div
                            className={`rounded-md border p-2 text-sm ${q.correctOption === "A" ? "border-green-400 bg-green-50" : ""}`}
                          >
                            <span className="font-medium">A:</span> {q.optionA}
                          </div>
                          <div
                            className={`rounded-md border p-2 text-sm ${q.correctOption === "B" ? "border-green-400 bg-green-50" : ""}`}
                          >
                            <span className="font-medium">B:</span> {q.optionB}
                          </div>
                          <div
                            className={`rounded-md border p-2 text-sm ${q.correctOption === "C" ? "border-green-400 bg-green-50" : ""}`}
                          >
                            <span className="font-medium">C:</span> {q.optionC}
                          </div>
                          <div
                            className={`rounded-md border p-2 text-sm ${q.correctOption === "D" ? "border-green-400 bg-green-50" : ""}`}
                          >
                            <span className="font-medium">D:</span> {q.optionD}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Explanation:</p>
                          <p className="text-sm text-muted-foreground">
                            {q.explanation}
                          </p>
                        </div>
                        {q.pyqSource && (
                          <p className="text-xs text-muted-foreground">
                            Source: {q.pyqSource}{" "}
                            {q.pyqYear && `(${q.pyqYear})`}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalCount} question{totalCount !== 1 ? "s" : ""}
        </span>
        <span>
          Page {page} of {totalPages}
        </span>
      </div>
    </div>
  );
}
