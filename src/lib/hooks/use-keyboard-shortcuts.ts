"use client";

import { useEffect } from "react";
import { useExamSessionStore } from "@/stores/exam-session.store";

export function useKeyboardShortcuts(enabled: boolean) {
  const {
    selectOption,
    navigateTo,
    currentQuestionIndex,
    questions,
    toggleMarkForReview,
    clearResponse,
  } = useExamSessionStore();

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "a":
        case "1":
          e.preventDefault();
          selectOption("A");
          break;
        case "b":
        case "2":
          e.preventDefault();
          selectOption("B");
          break;
        case "c":
        case "3":
          e.preventDefault();
          selectOption("C");
          break;
        case "d":
        case "4":
          e.preventDefault();
          selectOption("D");
          break;
        case "arrowright":
        case "enter":
          e.preventDefault();
          if (currentQuestionIndex < questions.length - 1) {
            navigateTo(currentQuestionIndex + 1);
          }
          break;
        case "arrowleft":
          e.preventDefault();
          if (currentQuestionIndex > 0) {
            navigateTo(currentQuestionIndex - 1);
          }
          break;
        case "m":
          e.preventDefault();
          toggleMarkForReview();
          break;
        case "x":
          e.preventDefault();
          clearResponse();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    currentQuestionIndex,
    questions.length,
    selectOption,
    navigateTo,
    toggleMarkForReview,
    clearResponse,
  ]);
}
