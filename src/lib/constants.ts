export const ROLES = { ADMIN: "ADMIN", PARTICIPANT: "PARTICIPANT" } as const;

export const EXAM_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;

export const DIFFICULTY = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;

export const QUESTION_SOURCE = {
  AI_GENERATED: "AI_GENERATED",
  PYQ: "PYQ",
  MANUAL: "MANUAL",
} as const;

export const QUESTION_NAV_STATUS = {
  NOT_VISITED: "NOT_VISITED",
  VISITED: "VISITED",
  ANSWERED: "ANSWERED",
  MARKED_FOR_REVIEW: "MARKED_FOR_REVIEW",
  ANSWERED_AND_MARKED: "ANSWERED_AND_MARKED",
} as const;

// Color mapping for question navigation palette
export const QUESTION_STATUS_COLORS = {
  NOT_VISITED: { bg: "bg-gray-200", border: "border-gray-300", text: "text-gray-600" },
  VISITED: { bg: "bg-red-200", border: "border-red-400", text: "text-red-800" },
  ANSWERED: { bg: "bg-green-200", border: "border-green-400", text: "text-green-800" },
  MARKED_FOR_REVIEW: { bg: "bg-purple-200", border: "border-purple-400", text: "text-purple-800" },
  ANSWERED_AND_MARKED: { bg: "bg-blue-200", border: "border-blue-400", text: "text-blue-800" },
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_EXAM_DURATION_MINUTES = 480;
export const MAX_QUESTIONS_PER_EXAM = 200;
export const TIMER_SYNC_INTERVAL_MS = 60000;
export const ANSWER_DEBOUNCE_MS = 2000;
export const BULK_SYNC_INTERVAL_MS = 30000;
export const TAB_SWITCH_WARN_THRESHOLD = 3;
export const TAB_SWITCH_AUTO_SUBMIT_THRESHOLD = 5;
