import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "PARTICIPANT"]);

export const examStatusEnum = pgEnum("exam_status", [
  "DRAFT",
  "SCHEDULED",
  "LIVE",
  "COMPLETED",
  "ARCHIVED",
]);

export const difficultyLevelEnum = pgEnum("difficulty_level", [
  "EASY",
  "MEDIUM",
  "HARD",
]);

export const questionSourceEnum = pgEnum("question_source", [
  "AI_GENERATED",
  "PYQ",
  "MANUAL",
]);

export const questionStatusEnum = pgEnum("question_status", [
  "NOT_VISITED",
  "VISITED",
  "ANSWERED",
  "MARKED_FOR_REVIEW",
  "ANSWERED_AND_MARKED",
]);

export const examSessionStatusEnum = pgEnum("exam_session_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "AUTO_SUBMITTED",
  "TIMED_OUT",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
]);

export const questionModeEnum = pgEnum("question_mode", [
  "PRE_GENERATED",
  "DYNAMIC",
  "POOL_BASED",
]);

export const generationJobStatusEnum = pgEnum("generation_job_status", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
]);

export const timeAnalysisEnum = pgEnum("time_analysis", [
  "TOO_FAST",
  "OPTIMAL",
  "TOO_SLOW",
]);
