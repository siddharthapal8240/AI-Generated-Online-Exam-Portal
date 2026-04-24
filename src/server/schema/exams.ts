import {
  boolean,
  index,
  integer,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

import { difficultyLevelEnum, examStatusEnum, invitationStatusEnum } from "./enums";
import { topics } from "./topics";
import { users } from "./users";

export const exams = pgTable(
  "exams",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    instructions: text("instructions"),
    createdById: text("created_by_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    status: examStatusEnum("status").default("DRAFT").notNull(),
    scheduledStartTime: timestamp("scheduled_start_time", { withTimezone: true }),
    scheduledEndTime: timestamp("scheduled_end_time", { withTimezone: true }),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferMinutes: integer("buffer_minutes").default(0).notNull(),
    totalQuestions: integer("total_questions").notNull(),
    totalMarks: real("total_marks").notNull(),
    marksPerQuestion: real("marks_per_question").notNull(),
    negativeMarking: real("negative_marking").default(0).notNull(),
    passingPercentage: real("passing_percentage"),
    shuffleQuestions: boolean("shuffle_questions").default(true).notNull(),
    showResultInstantly: boolean("show_result_instantly").default(false).notNull(),
    allowTabSwitch: boolean("allow_tab_switch").default(false).notNull(),
    maxTabSwitches: integer("max_tab_switches").default(3).notNull(),
    useAiGeneration: boolean("use_ai_generation").default(true).notNull(),
    usePyqBank: boolean("use_pyq_bank").default(true).notNull(),
    targetDifficulty: difficultyLevelEnum("target_difficulty")
      .default("MEDIUM")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("exams_created_by_id_idx").on(table.createdById),
    index("exams_status_idx").on(table.status),
    index("exams_scheduled_start_idx").on(table.scheduledStartTime),
  ],
);

export const examTopicConfigs = pgTable(
  "exam_topic_configs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),
    topicId: text("topic_id")
      .references(() => topics.id, { onDelete: "restrict" })
      .notNull(),
    questionCount: integer("question_count").notNull(),
    marksPerQuestion: real("marks_per_question").notNull(),
    negativeMarking: real("negative_marking"),
    difficulty: difficultyLevelEnum("difficulty").default("MEDIUM").notNull(),
    pyqPercentage: integer("pyq_percentage").default(50).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("exam_topic_configs_exam_topic_unique").on(table.examId, table.topicId),
    index("exam_topic_configs_exam_id_idx").on(table.examId),
    index("exam_topic_configs_topic_id_idx").on(table.topicId),
  ],
);

export const examInvitations = pgTable(
  "exam_invitations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    status: invitationStatusEnum("status").default("PENDING").notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    token: text("token")
      .unique()
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
  },
  (table) => [
    unique("exam_invitations_exam_email_unique").on(table.examId, table.email),
    index("exam_invitations_exam_id_idx").on(table.examId),
    index("exam_invitations_user_id_idx").on(table.userId),
    index("exam_invitations_token_idx").on(table.token),
    index("exam_invitations_email_idx").on(table.email),
  ],
);
