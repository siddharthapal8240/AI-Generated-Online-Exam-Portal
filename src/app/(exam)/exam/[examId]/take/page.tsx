"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useExamSessionStore } from "@/stores/exam-session.store";
import { useExamTimer } from "@/lib/hooks/use-exam-timer";
import { useAnswerSync } from "@/lib/hooks/use-answer-sync";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useAntiCheat } from "@/lib/hooks/use-anti-cheat";
import { ExamHeader } from "./_components/exam-header";
import { QuestionPanel } from "./_components/question-panel";
import { QuestionNavPalette } from "./_components/question-nav-palette";
import { SubmitDialog } from "./_components/submit-dialog";
import { Loader2 } from "lucide-react";

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const store = useExamSessionStore();
  const { submitExam } = useAnswerSync(store.sessionId);

  const handleAutoSubmit = useCallback(async () => {
    if (store.isSubmitted) return;
    const result = await submitExam("auto");
    if (result?.success) {
      store.markSubmitted();
      router.push(`/exam/${examId}/result`);
    }
  }, [submitExam, store, router, examId]);

  const timer = useExamTimer(handleAutoSubmit);
  useKeyboardShortcuts(!showSubmitDialog && !store.isSubmitted);
  useAntiCheat({
    enabled: !store.isSubmitted,
    onTabSwitch: (count) => {
      if (count >= 3)
        alert(
          `Warning: Tab switch detected (${count} times). Your activity is being monitored.`,
        );
    },
    maxTabSwitches: 5,
    onMaxReached: handleAutoSubmit,
  });

  // Initialize session
  useEffect(() => {
    async function init() {
      // Check if we have an existing session in store for this exam
      if (store.sessionId && store.examId === examId && !store.isSubmitted) {
        setLoading(false);
        return;
      }

      try {
        // Start new session
        const startRes = await fetch("/api/exam-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId }),
        });
        const startData = await startRes.json();

        if (!startData.success) {
          setError(startData.error);
          setLoading(false);
          return;
        }

        // Load session data
        const sessionRes = await fetch(
          `/api/exam-session/${startData.data.sessionId}`,
        );
        const sessionData = await sessionRes.json();

        if (!sessionData.success) {
          setError(sessionData.error);
          setLoading(false);
          return;
        }

        store.initSession(sessionData.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to start exam session");
        setLoading(false);
      }
    }

    init();
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [submitting, setSubmitting] = useState(false);

  const handleManualSubmit = async () => {
    if (submitting || store.isSubmitted) return;
    setSubmitting(true);
    try {
      const result = await submitExam("manual");
      if (result?.success) {
        store.markSubmitted();
        store.resetStore();
        router.push(`/exam/${examId}/result`);
      } else {
        alert(result?.error || "Failed to submit. Please try again.");
        setSubmitting(false);
      }
    } catch {
      alert("Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  // Start timing Q1 only when the exam UI is actually visible
  useEffect(() => {
    if (!loading && !error && !store.isSubmitted) {
      store.startTiming();
    }
  }, [loading, error]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading exam...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-destructive">{error}</p>
        <button
          onClick={() => router.back()}
          className="text-primary underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden select-none">
      <ExamHeader
        timer={timer}
        onSubmitClick={() => setShowSubmitDialog(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <QuestionPanel />
        <QuestionNavPalette />
      </div>
      <SubmitDialog
        open={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirm={handleManualSubmit}
      />
    </div>
  );
}
