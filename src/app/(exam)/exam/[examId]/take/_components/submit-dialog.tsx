"use client";

import { useState } from "react";
import { useExamSessionStore } from "@/stores/exam-session.store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

interface SubmitDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SubmitDialog({ open, onClose, onConfirm }: SubmitDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const { questions, getAnsweredCount, getNotVisitedCount, getMarkedCount } =
    useExamSessionStore();

  const answered = getAnsweredCount();
  const notVisited = getNotVisitedCount();
  const notAnswered = questions.filter((q) => q.status === "VISITED").length;
  const marked = getMarkedCount();
  const unattempted = notVisited + notAnswered;

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm();
    // If onConfirm doesn't redirect (error case), reset
    setSubmitting(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {submitting ? (
          // Submitting state — full takeover
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-semibold">Submitting your exam...</p>
              <p className="text-sm text-muted-foreground">
                Saving answers and calculating your score
              </p>
            </div>
          </div>
        ) : (
          // Confirmation state
          <>
            <DialogHeader>
              <DialogTitle>Submit Exam</DialogTitle>
              <DialogDescription>
                Are you sure? You cannot change your answers after submission.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Total Questions:</span>
                <span className="font-medium">{questions.length}</span>
                <span className="text-muted-foreground">Answered:</span>
                <span className="font-medium text-green-700">{answered}</span>
                <span className="text-muted-foreground">Unattempted:</span>
                <span className="font-medium text-red-700">{unattempted}</span>
                <span className="text-muted-foreground">Marked for Review:</span>
                <span className="font-medium text-purple-700">{marked}</span>
              </div>
            </div>

            {unattempted > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  You have <strong>{unattempted}</strong> unattempted question
                  {unattempted !== 1 ? "s" : ""}
                  {marked > 0 && (
                    <>
                      {" "}and <strong>{marked}</strong> marked for review
                    </>
                  )}.
                </span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose}>
                Go Back to Exam
              </Button>
              <Button variant="destructive" onClick={handleConfirm}>
                Confirm Submit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
