"use client";

import { useEffect, useRef, useCallback } from "react";
import { useExamSessionStore } from "@/stores/exam-session.store";

const SYNC_INTERVAL = 30000; // 30 seconds
const CLOCK_SYNC_INTERVAL = 60000; // 60 seconds

export function useAnswerSync(sessionId: string | null) {
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clockSyncRef = useRef<NodeJS.Timeout | null>(null);
  const { getDirtyAnswers, clearDirty, updateServerTimeOffset } =
    useExamSessionStore();

  const syncAnswers = useCallback(async () => {
    if (!sessionId) return;
    const dirty = getDirtyAnswers();
    if (dirty.length === 0) return;

    try {
      const res = await fetch(`/api/exam-session/${sessionId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: dirty }),
      });
      if (res.ok) {
        clearDirty();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }, [sessionId, getDirtyAnswers, clearDirty]);

  const syncClock = useCallback(async () => {
    try {
      const res = await fetch("/api/time");
      const data = await res.json();
      updateServerTimeOffset(data.serverTime);
    } catch (error) {
      console.error("Clock sync failed:", error);
    }
  }, [updateServerTimeOffset]);

  // Periodic sync
  useEffect(() => {
    if (!sessionId) return;

    syncTimeoutRef.current = setInterval(syncAnswers, SYNC_INTERVAL);
    clockSyncRef.current = setInterval(syncClock, CLOCK_SYNC_INTERVAL);

    return () => {
      if (syncTimeoutRef.current) clearInterval(syncTimeoutRef.current);
      if (clockSyncRef.current) clearInterval(clockSyncRef.current);
    };
  }, [sessionId, syncAnswers, syncClock]);

  // Save single answer (debounced via caller)
  const saveAnswer = useCallback(
    async (data: {
      examQuestionId: string;
      selectedOption: string | null;
      status: string;
      timeSpentSec: number;
    }) => {
      if (!sessionId) return;
      try {
        await fetch(`/api/exam-session/${sessionId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (error) {
        console.error("Save answer failed:", error);
      }
    },
    [sessionId],
  );

  // Submit exam
  const submitExam = useCallback(
    async (type: "manual" | "auto") => {
      if (!sessionId) return null;
      const dirty = getDirtyAnswers();
      try {
        const res = await fetch(`/api/exam-session/${sessionId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: dirty, submitType: type }),
        });
        return await res.json();
      } catch (error) {
        console.error("Submit failed:", error);
        return null;
      }
    },
    [sessionId, getDirtyAnswers],
  );

  return { syncAnswers, saveAnswer, submitExam };
}
