import { index, integer, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

import { generationJobStatusEnum } from "./enums";

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").notNull(),
    userId: text("user_id").notNull(),
    examTag: text("exam_tag").notNull(), // examId or examId_userId for dynamic
    status: generationJobStatusEnum("status").default("PENDING").notNull(),
    totalTopics: integer("total_topics").default(0).notNull(),
    completedTopics: integer("completed_topics").default(0).notNull(),
    totalGenerated: integer("total_generated").default(0).notNull(),
    totalFailed: integer("total_failed").default(0).notNull(),
    currentTopic: text("current_topic"),
    errors: jsonb("errors").$type<string[]>().default([]),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("generation_jobs_exam_user_idx").on(table.examId, table.userId),
    index("generation_jobs_status_idx").on(table.status),
  ],
);
