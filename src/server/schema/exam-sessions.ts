import {
  boolean,
  index,
  integer,
  real,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

import { examSessionStatusEnum, questionStatusEnum, timeAnalysisEnum } from "./enums";
import { exams } from "./exams";
import { questions } from "./questions";
import { users } from "./users";

export const examSessions = pgTable(
  "exam_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id")
      .references(() => exams.id, { onDelete: "restrict" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    status: examSessionStatusEnum("status").default("NOT_STARTED").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    totalTimeSec: integer("total_time_sec"),
    tabSwitchCount: integer("tab_switch_count").default(0).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    totalAnswered: integer("total_answered"),
    totalCorrect: integer("total_correct"),
    totalIncorrect: integer("total_incorrect"),
    totalNotVisited: integer("total_not_visited"),
    totalMarkedReview: integer("total_marked_review"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("exam_sessions_exam_user_unique").on(table.examId, table.userId),
    index("exam_sessions_exam_id_idx").on(table.examId),
    index("exam_sessions_user_id_idx").on(table.userId),
    index("exam_sessions_status_idx").on(table.status),
  ],
);

export const examQuestions = pgTable(
  "exam_questions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .references(() => examSessions.id, { onDelete: "cascade" })
      .notNull(),
    questionId: text("question_id")
      .references(() => questions.id, { onDelete: "restrict" })
      .notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
    marksForCorrect: real("marks_for_correct").notNull(),
    marksForIncorrect: real("marks_for_incorrect").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("exam_questions_session_question_unique").on(
      table.sessionId,
      table.questionId,
    ),
    unique("exam_questions_session_sequence_unique").on(
      table.sessionId,
      table.sequenceNumber,
    ),
    index("exam_questions_session_id_idx").on(table.sessionId),
    index("exam_questions_question_id_idx").on(table.questionId),
  ],
);

export const examResponses = pgTable(
  "exam_responses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    examQuestionId: text("exam_question_id")
      .references(() => examQuestions.id, { onDelete: "cascade" })
      .unique()
      .notNull(),
    selectedOption: varchar("selected_option", { length: 1 }),
    status: questionStatusEnum("status").default("NOT_VISITED").notNull(),
    isCorrect: boolean("is_correct"),
    marksAwarded: real("marks_awarded"),
    totalTimeSec: real("total_time_sec").default(0).notNull(),
    visitCount: integer("visit_count").default(0).notNull(),
    timeAnalysisValue: timeAnalysisEnum("time_analysis_value"),
    firstAnsweredAt: timestamp("first_answered_at", { withTimezone: true }),
    lastModifiedAt: timestamp("last_modified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("exam_responses_exam_question_id_idx").on(table.examQuestionId),
    index("exam_responses_status_idx").on(table.status),
  ],
);

export const questionVisits = pgTable(
  "question_visits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    examQuestionId: text("exam_question_id")
      .references(() => examQuestions.id, { onDelete: "cascade" })
      .notNull(),
    visitNumber: integer("visit_number").notNull(),
    enteredAt: timestamp("entered_at", { withTimezone: true }).notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    durationSec: real("duration_sec"),
    actionTaken: text("action_taken"),
  },
  (table) => [
    index("question_visits_exam_question_id_idx").on(table.examQuestionId),
  ],
);
