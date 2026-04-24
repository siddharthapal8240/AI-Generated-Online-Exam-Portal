import {
  boolean,
  index,
  integer,
  jsonb,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

import { examSessions } from "./exam-sessions";
import { exams } from "./exams";
import { topics } from "./topics";
import { userProfiles, users } from "./users";

export const examResults = pgTable(
  "exam_results",
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
    sessionId: text("session_id")
      .references(() => examSessions.id, { onDelete: "restrict" })
      .unique()
      .notNull(),
    totalScore: real("total_score").notNull(),
    maxPossibleScore: real("max_possible_score").notNull(),
    percentage: real("percentage").notNull(),
    correctCount: integer("correct_count").notNull(),
    incorrectCount: integer("incorrect_count").notNull(),
    unattemptedCount: integer("unattempted_count").notNull(),
    positiveMarks: real("positive_marks").notNull(),
    negativeMarks: real("negative_marks").notNull(),
    totalTimeSec: integer("total_time_sec").notNull(),
    avgTimePerQuestionSec: real("avg_time_per_question_sec").notNull(),
    fastestQuestionSec: real("fastest_question_sec").notNull(),
    slowestQuestionSec: real("slowest_question_sec").notNull(),
    rank: integer("rank"),
    percentile: real("percentile"),
    isPassed: boolean("is_passed"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("exam_results_exam_user_unique").on(table.examId, table.userId),
    index("exam_results_exam_id_idx").on(table.examId),
    index("exam_results_user_id_idx").on(table.userId),
    index("exam_results_session_id_idx").on(table.sessionId),
  ],
);

export const topicBreakdowns = pgTable(
  "topic_breakdowns",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resultId: text("result_id")
      .references(() => examResults.id, { onDelete: "cascade" })
      .notNull(),
    topicName: text("topic_name").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    correctCount: integer("correct_count").notNull(),
    incorrectCount: integer("incorrect_count").notNull(),
    unattemptedCount: integer("unattempted_count").notNull(),
    score: real("score").notNull(),
    maxScore: real("max_score").notNull(),
    percentage: real("percentage").notNull(),
    avgTimeSec: real("avg_time_sec").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("topic_breakdowns_result_id_idx").on(table.resultId)],
);

export const topicPerformances = pgTable(
  "topic_performances",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userProfileId: text("user_profile_id")
      .references(() => userProfiles.id, { onDelete: "cascade" })
      .notNull(),
    topicId: text("topic_id")
      .references(() => topics.id, { onDelete: "restrict" })
      .notNull(),
    totalAttempted: integer("total_attempted").default(0).notNull(),
    totalCorrect: integer("total_correct").default(0).notNull(),
    accuracy: real("accuracy").default(0).notNull(),
    avgTimeSec: real("avg_time_sec"),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    strengthLevel: text("strength_level"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("topic_performances_profile_topic_unique").on(
      table.userProfileId,
      table.topicId,
    ),
    index("topic_performances_user_profile_id_idx").on(table.userProfileId),
    index("topic_performances_topic_id_idx").on(table.topicId),
  ],
);

export const examStatistics = pgTable(
  "exam_statistics",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .unique()
      .notNull(),
    totalParticipants: integer("total_participants").notNull(),
    totalSubmitted: integer("total_submitted").notNull(),
    averageScore: real("average_score").notNull(),
    medianScore: real("median_score").notNull(),
    highestScore: real("highest_score").notNull(),
    lowestScore: real("lowest_score").notNull(),
    standardDeviation: real("standard_deviation").notNull(),
    averageTimeSec: integer("average_time_sec").notNull(),
    passCount: integer("pass_count").default(0).notNull(),
    failCount: integer("fail_count").default(0).notNull(),
    scoreDistribution: jsonb("score_distribution"),
    computedAt: timestamp("computed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("exam_statistics_exam_id_idx").on(table.examId)],
);
