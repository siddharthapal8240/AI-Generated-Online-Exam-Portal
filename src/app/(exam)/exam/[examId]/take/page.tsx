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
  const [loadingMessage, setLoadingMessage] = useState("Loading exam...");
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
        // Step 1: Try to start session
        setLoadingMessage("Starting exam session...");
        let startRes = await fetch("/api/exam-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId }),
        });
        let startData = await startRes.json();

        // Step 2: Dynamic mode — generate ALL questions first, then start
        if (!startData.success && startData.needsGeneration) {
          setLoadingMessage("Preparing your unique question set...");

          // Get topic list and create generation job
          const initRes = await fetch(`/api/exams/${examId}/generate-for-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start" }),
          });
          const initData = await initRes.json();

          if (!initData.success) {
            setError(initData.error || "Failed to prepare questions");
            setLoading(false);
            return;
          }

          // Already generated previously
          if (initData.data.status === "ALREADY_DONE") {
            setLoadingMessage("Questions ready. Starting exam...");
          } else if (initData.data.status === "READY") {
            // Generate each topic one by one (each ~8s, within 10s Vercel limit)
            const topicsList = initData.data.topics;
            let totalGenerated = 0;

            for (let i = 0; i < topicsList.length; i++) {
              const t = topicsList[i];
              setLoadingMessage(
                `Generating: ${t.topicName} (${i + 1}/${topicsList.length})`,
              );

              try {
                const genRes = await fetch(
                  `/api/exams/${examId}/generate-for-user`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ topicConfigId: t.configId }),
                  },
                );
                const genData = await genRes.json();

                if (genData.success) {
                  totalGenerated += genData.data.generated;
                  setLoadingMessage(
                    `Generated ${totalGenerated} questions (${i + 1}/${topicsList.length} topics done)`,
                  );
                } else {
                  console.error(`Failed: ${t.topicName}`, genData.error);
                }
              } catch (genErr) {
                console.error(`Error generating ${t.topicName}:`, genErr);
              }
            }

            if (totalGenerated === 0) {
              setError("Failed to generate questions. Please try again.");
              setLoading(false);
              return;
            }

            setLoadingMessage(
              `All ${totalGenerated} questions generated! Starting exam...`,
            );
          }

          // Now start the session — questions are in the DB
          startRes = await fetch("/api/exam-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examId }),
          });
          startData = await startRes.json();
        }

        if (!startData.success) {
          setError(startData.error);
          setLoading(false);
          return;
        }

        // Step 3: Load session data
        setLoadingMessage("Loading questions...");
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
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-lg">{loadingMessage}</span>
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
