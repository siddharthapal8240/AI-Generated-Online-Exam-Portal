import {
  boolean,
  index,
  integer,
  real,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

import { difficultyLevelEnum, questionSourceEnum } from "./enums";
import { topics } from "./topics";

export const questions = pgTable(
  "questions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    topicId: text("topic_id")
      .references(() => topics.id, { onDelete: "restrict" })
      .notNull(),
    source: questionSourceEnum("source").notNull(),
    questionText: text("question_text").notNull(),
    questionHtml: text("question_html"),
    questionImageUrl: text("question_image_url"),
    optionA: text("option_a").notNull(),
    optionB: text("option_b").notNull(),
    optionC: text("option_c").notNull(),
    optionD: text("option_d").notNull(),
    correctOption: varchar("correct_option", { length: 1 }).notNull(),
    explanation: text("explanation").notNull(),
    explanationHtml: text("explanation_html"),
    difficulty: difficultyLevelEnum("difficulty").default("MEDIUM").notNull(),
    pyqSource: text("pyq_source"),
    pyqYear: integer("pyq_year"),
    tags: text("tags")
      .array()
      .default([])
      .notNull(),
    aiModel: text("ai_model"),
    aiPromptHash: text("ai_prompt_hash"),
    generatedForExamId: text("generated_for_exam_id"),
    timesUsed: integer("times_used").default(0).notNull(),
    timesCorrect: integer("times_correct").default(0).notNull(),
    averageTimeSec: real("average_time_sec"),
    discriminationIndex: real("discrimination_index"),
    isVerified: boolean("is_verified").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("questions_topic_id_idx").on(table.topicId),
    index("questions_source_idx").on(table.source),
    index("questions_difficulty_idx").on(table.difficulty),
    index("questions_is_active_idx").on(table.isActive),
    index("questions_pyq_year_idx").on(table.pyqYear),
    index("questions_generated_for_exam_idx").on(table.generatedForExamId),
  ],
);
