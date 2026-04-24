import { relations } from "drizzle-orm";

import {
  examQuestions,
  examResponses,
  examSessions,
  questionVisits,
} from "./exam-sessions";
import { examInvitations, exams, examTopicConfigs } from "./exams";
import { questions } from "./questions";
import {
  examResults,
  examStatistics,
  topicBreakdowns,
  topicPerformances,
} from "./results";
import { topics } from "./topics";
import { userProfiles, users } from "./users";

// ─── User Relations ──────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  createdExams: many(exams),
  examSessions: many(examSessions),
  examInvitations: many(examInvitations),
  examResults: many(examResults),
}));

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
  topicPerformances: many(topicPerformances),
}));

// ─── Topic Relations ─────────────────────────────────────────────────────────

export const topicsRelations = relations(topics, ({ one, many }) => ({
  parent: one(topics, {
    fields: [topics.parentId],
    references: [topics.id],
    relationName: "topicHierarchy",
  }),
  children: many(topics, {
    relationName: "topicHierarchy",
  }),
  questions: many(questions),
  examTopicConfigs: many(examTopicConfigs),
  topicPerformances: many(topicPerformances),
}));

// ─── Exam Relations ──────────────────────────────────────────────────────────

export const examsRelations = relations(exams, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [exams.createdById],
    references: [users.id],
  }),
  topicConfigs: many(examTopicConfigs),
  invitations: many(examInvitations),
  sessions: many(examSessions),
  results: many(examResults),
  statistics: one(examStatistics, {
    fields: [exams.id],
    references: [examStatistics.examId],
  }),
}));

export const examTopicConfigsRelations = relations(examTopicConfigs, ({ one }) => ({
  exam: one(exams, {
    fields: [examTopicConfigs.examId],
    references: [exams.id],
  }),
  topic: one(topics, {
    fields: [examTopicConfigs.topicId],
    references: [topics.id],
  }),
}));

export const examInvitationsRelations = relations(examInvitations, ({ one }) => ({
  exam: one(exams, {
    fields: [examInvitations.examId],
    references: [exams.id],
  }),
  user: one(users, {
    fields: [examInvitations.userId],
    references: [users.id],
  }),
}));

// ─── Question Relations ──────────────────────────────────────────────────────

export const questionsRelations = relations(questions, ({ one, many }) => ({
  topic: one(topics, {
    fields: [questions.topicId],
    references: [topics.id],
  }),
  examQuestions: many(examQuestions),
}));

// ─── Exam Session Relations ──────────────────────────────────────────────────

export const examSessionsRelations = relations(examSessions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [examSessions.examId],
    references: [exams.id],
  }),
  user: one(users, {
    fields: [examSessions.userId],
    references: [users.id],
  }),
  examQuestions: many(examQuestions),
  result: one(examResults, {
    fields: [examSessions.id],
    references: [examResults.sessionId],
  }),
}));

export const examQuestionsRelations = relations(examQuestions, ({ one, many }) => ({
  session: one(examSessions, {
    fields: [examQuestions.sessionId],
    references: [examSessions.id],
  }),
  question: one(questions, {
    fields: [examQuestions.questionId],
    references: [questions.id],
  }),
  response: one(examResponses, {
    fields: [examQuestions.id],
    references: [examResponses.examQuestionId],
  }),
  visits: many(questionVisits),
}));

export const examResponsesRelations = relations(examResponses, ({ one }) => ({
  examQuestion: one(examQuestions, {
    fields: [examResponses.examQuestionId],
    references: [examQuestions.id],
  }),
}));

export const questionVisitsRelations = relations(questionVisits, ({ one }) => ({
  examQuestion: one(examQuestions, {
    fields: [questionVisits.examQuestionId],
    references: [examQuestions.id],
  }),
}));

// ─── Result Relations ────────────────────────────────────────────────────────

export const examResultsRelations = relations(examResults, ({ one, many }) => ({
  exam: one(exams, {
    fields: [examResults.examId],
    references: [exams.id],
  }),
  user: one(users, {
    fields: [examResults.userId],
    references: [users.id],
  }),
  session: one(examSessions, {
    fields: [examResults.sessionId],
    references: [examSessions.id],
  }),
  topicBreakdowns: many(topicBreakdowns),
}));

export const topicBreakdownsRelations = relations(topicBreakdowns, ({ one }) => ({
  result: one(examResults, {
    fields: [topicBreakdowns.resultId],
    references: [examResults.id],
  }),
}));

export const topicPerformancesRelations = relations(topicPerformances, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [topicPerformances.userProfileId],
    references: [userProfiles.id],
  }),
  topic: one(topics, {
    fields: [topicPerformances.topicId],
    references: [topics.id],
  }),
}));

export const examStatisticsRelations = relations(examStatistics, ({ one }) => ({
  exam: one(exams, {
    fields: [examStatistics.examId],
    references: [exams.id],
  }),
}));
