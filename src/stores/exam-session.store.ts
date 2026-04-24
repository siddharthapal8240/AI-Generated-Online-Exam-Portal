import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QuestionNavStatus =
  | "NOT_VISITED"
  | "VISITED"
  | "ANSWERED"
  | "MARKED_FOR_REVIEW"
  | "ANSWERED_AND_MARKED";

export interface QuestionState {
  examQuestionId: string;
  sequenceNumber: number;
  questionId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  difficulty: string;
  selectedOption: string | null;
  status: QuestionNavStatus;
  timeSpentSec: number;
  markedForReview: boolean;
}

interface ExamSessionState {
  // Session info
  sessionId: string | null;
  examId: string | null;
  examTitle: string;
  status: string;

  // Timer
  expiresAt: number; // unix ms
  serverTimeOffset: number; // clientTime - serverTime
  durationMinutes: number;

  // Questions
  questions: QuestionState[];
  currentQuestionIndex: number;
  questionEnteredAt: number; // timestamp when user navigated to current question

  // Exam config
  marksPerQuestion: number;
  negativeMarking: number;
  showResultInstantly: boolean;
  totalQuestions: number;

  // Dirty tracking for sync
  dirtyQuestionIds: Set<string>;
  isSubmitted: boolean;

  // Actions
  initSession: (data: {
    sessionId: string;
    examId: string;
    examTitle: string;
    expiresAt: number;
    serverTime: number;
    durationMinutes: number;
    marksPerQuestion: number;
    negativeMarking: number;
    showResultInstantly: boolean;
    questions: Array<{
      examQuestionId: string;
      sequenceNumber: number;
      questionId: string;
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      difficulty: string;
      selectedOption: string | null;
      status: string;
      timeSpentSec: number;
    }>;
  }) => void;

  startTiming: () => void;
  navigateTo: (index: number) => void;
  selectOption: (option: string | null) => void;
  toggleMarkForReview: () => void;
  clearResponse: () => void;
  markSubmitted: () => void;
  updateServerTimeOffset: (serverTime: number) => void;

  // Computed
  getAnsweredCount: () => number;
  getNotVisitedCount: () => number;
  getMarkedCount: () => number;
  getDirtyAnswers: () => Array<{
    examQuestionId: string;
    selectedOption: string | null;
    status: string;
    timeSpentSec: number;
  }>;
  clearDirty: () => void;
  resetStore: () => void;
}

const initialState = {
  sessionId: null as string | null,
  examId: null as string | null,
  examTitle: "",
  status: "",
  expiresAt: 0,
  serverTimeOffset: 0,
  durationMinutes: 0,
  questions: [] as QuestionState[],
  currentQuestionIndex: 0,
  questionEnteredAt: Date.now(),
  marksPerQuestion: 1,
  negativeMarking: 0,
  showResultInstantly: false,
  totalQuestions: 0,
  dirtyQuestionIds: new Set<string>(),
  isSubmitted: false,
};

export const useExamSessionStore = create<ExamSessionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initSession: (data) => {
        const questions: QuestionState[] = data.questions.map((q) => ({
          examQuestionId: q.examQuestionId,
          sequenceNumber: q.sequenceNumber,
          questionId: q.questionId,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          difficulty: q.difficulty,
          selectedOption: q.selectedOption,
          status: (q.status as QuestionNavStatus) || "NOT_VISITED",
          timeSpentSec: q.timeSpentSec || 0,
          markedForReview:
            q.status === "MARKED_FOR_REVIEW" ||
            q.status === "ANSWERED_AND_MARKED",
        }));

        set({
          sessionId: data.sessionId,
          examId: data.examId,
          examTitle: data.examTitle,
          status: "IN_PROGRESS",
          expiresAt: data.expiresAt,
          serverTimeOffset: Date.now() - data.serverTime,
          durationMinutes: data.durationMinutes,
          marksPerQuestion: data.marksPerQuestion,
          negativeMarking: data.negativeMarking,
          showResultInstantly: data.showResultInstantly,
          totalQuestions: questions.length,
          questions,
          currentQuestionIndex: 0,
          questionEnteredAt: 0, // Will be set when UI actually renders via startTiming()
          dirtyQuestionIds: new Set(),
          isSubmitted: false,
        });
      },

      startTiming: () => {
        // Called when the exam UI is fully rendered and Q1 is visible
        // Always set to now — this is when the user actually starts seeing the question
        set({ questionEnteredAt: Date.now() });
      },

      navigateTo: (index) => {
        const state = get();
        if (index < 0 || index >= state.questions.length) return;

        // Record time on current question
        const now = Date.now();
        const elapsed =
          state.questionEnteredAt > 0
            ? Math.max(0, (now - state.questionEnteredAt) / 1000)
            : 0;
        const currentQ = state.questions[state.currentQuestionIndex];

        const updatedQuestions = [...state.questions];

        // Update time on current question
        if (currentQ) {
          updatedQuestions[state.currentQuestionIndex] = {
            ...currentQ,
            timeSpentSec: currentQ.timeSpentSec + elapsed,
          };
        }

        // Mark target question as visited if not yet
        const targetQ = updatedQuestions[index];
        if (targetQ && targetQ.status === "NOT_VISITED") {
          updatedQuestions[index] = { ...targetQ, status: "VISITED" };
        }

        set({
          questions: updatedQuestions,
          currentQuestionIndex: index,
          questionEnteredAt: Date.now(),
        });
      },

      selectOption: (option) => {
        const state = get();
        const currentQ = state.questions[state.currentQuestionIndex];
        if (!currentQ) return;

        const newStatus: QuestionNavStatus = option
          ? currentQ.markedForReview
            ? "ANSWERED_AND_MARKED"
            : "ANSWERED"
          : currentQ.markedForReview
            ? "MARKED_FOR_REVIEW"
            : "VISITED";

        const updatedQuestions = [...state.questions];
        updatedQuestions[state.currentQuestionIndex] = {
          ...currentQ,
          selectedOption: option,
          status: newStatus,
        };

        const newDirty = new Set(state.dirtyQuestionIds);
        newDirty.add(currentQ.examQuestionId);

        set({ questions: updatedQuestions, dirtyQuestionIds: newDirty });
      },

      toggleMarkForReview: () => {
        const state = get();
        const currentQ = state.questions[state.currentQuestionIndex];
        if (!currentQ) return;

        const newMarked = !currentQ.markedForReview;
        let newStatus: QuestionNavStatus;

        if (newMarked) {
          newStatus = currentQ.selectedOption
            ? "ANSWERED_AND_MARKED"
            : "MARKED_FOR_REVIEW";
        } else {
          newStatus = currentQ.selectedOption ? "ANSWERED" : "VISITED";
        }

        const updatedQuestions = [...state.questions];
        updatedQuestions[state.currentQuestionIndex] = {
          ...currentQ,
          markedForReview: newMarked,
          status: newStatus,
        };

        const newDirty = new Set(state.dirtyQuestionIds);
        newDirty.add(currentQ.examQuestionId);

        set({ questions: updatedQuestions, dirtyQuestionIds: newDirty });
      },

      clearResponse: () => {
        const state = get();
        const currentQ = state.questions[state.currentQuestionIndex];
        if (!currentQ) return;

        const newStatus: QuestionNavStatus = currentQ.markedForReview
          ? "MARKED_FOR_REVIEW"
          : "VISITED";

        const updatedQuestions = [...state.questions];
        updatedQuestions[state.currentQuestionIndex] = {
          ...currentQ,
          selectedOption: null,
          status: newStatus,
        };

        const newDirty = new Set(state.dirtyQuestionIds);
        newDirty.add(currentQ.examQuestionId);

        set({ questions: updatedQuestions, dirtyQuestionIds: newDirty });
      },

      markSubmitted: () => set({ isSubmitted: true, status: "SUBMITTED" }),

      updateServerTimeOffset: (serverTime) => {
        const measured = Date.now() - serverTime;
        const current = get().serverTimeOffset;
        // Exponential moving average
        set({ serverTimeOffset: 0.7 * current + 0.3 * measured });
      },

      getAnsweredCount: () =>
        get().questions.filter(
          (q) =>
            q.status === "ANSWERED" || q.status === "ANSWERED_AND_MARKED",
        ).length,

      getNotVisitedCount: () =>
        get().questions.filter((q) => q.status === "NOT_VISITED").length,

      getMarkedCount: () =>
        get().questions.filter(
          (q) =>
            q.status === "MARKED_FOR_REVIEW" ||
            q.status === "ANSWERED_AND_MARKED",
        ).length,

      getDirtyAnswers: () => {
        const state = get();
        return state.questions
          .filter((q) => state.dirtyQuestionIds.has(q.examQuestionId))
          .map((q) => ({
            examQuestionId: q.examQuestionId,
            selectedOption: q.selectedOption,
            status: q.status,
            timeSpentSec: q.timeSpentSec,
          }));
      },

      clearDirty: () => set({ dirtyQuestionIds: new Set() }),

      resetStore: () => set(initialState),
    }),
    {
      name: "exam-session",
      // Custom serializer to handle Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed?.state?.dirtyQuestionIds) {
            parsed.state.dirtyQuestionIds = new Set(
              parsed.state.dirtyQuestionIds,
            );
          }
          return parsed;
        },
        setItem: (name, value) => {
          const toStore = {
            ...value,
            state: {
              ...value.state,
              dirtyQuestionIds: Array.from(
                value.state.dirtyQuestionIds || [],
              ),
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
);
