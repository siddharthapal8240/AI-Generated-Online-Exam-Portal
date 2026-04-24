import { db } from "@/server/db";
import {
  examSessions,
  examQuestions,
  examResponses,
} from "@/server/schema";
import { eq, and, sql } from "drizzle-orm";

// Start a new exam session
export async function createExamSession(data: {
  examId: string;
  userId: string;
  expiresAt: Date;
}) {
  const [session] = await db
    .insert(examSessions)
    .values({
      examId: data.examId,
      userId: data.userId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      expiresAt: data.expiresAt,
    })
    .returning();
  return session;
}

// Get session with all data needed for the exam UI
export async function getExamSession(sessionId: string) {
  return db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
    with: {
      exam: true,
      examQuestions: {
        orderBy: (examQuestion, { asc }) => [asc(examQuestion.sequenceNumber)],
        with: {
          question: true,
          response: true,
        },
      },
    },
  });
}

// Get session by exam and user (check if already exists)
export async function getSessionByExamAndUser(examId: string, userId: string) {
  return db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.examId, examId),
      eq(examSessions.userId, userId),
    ),
  });
}

// Assign questions to a session (Fisher-Yates shuffle from pool)
export async function assignQuestionsToSession(
  sessionId: string,
  questionPool: {
    id: string;
    marksForCorrect: number;
    marksForIncorrect: number;
  }[],
) {
  // Fisher-Yates shuffle
  const shuffled = [...questionPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const values = shuffled.map((q, index) => ({
    sessionId,
    questionId: q.id,
    sequenceNumber: index + 1,
    marksForCorrect: q.marksForCorrect,
    marksForIncorrect: q.marksForIncorrect,
  }));

  await db.insert(examQuestions).values(values);

  // Create empty responses for each question
  const insertedQuestions = await db.query.examQuestions.findMany({
    where: eq(examQuestions.sessionId, sessionId),
  });

  const responseValues = insertedQuestions.map((examQ) => ({
    examQuestionId: examQ.id,
    status: "NOT_VISITED" as const,
    totalTimeSec: 0,
    visitCount: 0,
  }));

  await db.insert(examResponses).values(responseValues);
}

// Save a single answer
export async function saveAnswer(data: {
  examQuestionId: string;
  selectedOption: string | null;
  status: string;
  timeSpentSec: number;
}) {
  const [response] = await db
    .update(examResponses)
    .set({
      selectedOption: data.selectedOption,
      status: data.status as
        | "NOT_VISITED"
        | "VISITED"
        | "ANSWERED"
        | "MARKED_FOR_REVIEW"
        | "ANSWERED_AND_MARKED",
      totalTimeSec: data.timeSpentSec,
      lastModifiedAt: new Date(),
      firstAnsweredAt: data.selectedOption
        ? sql`COALESCE(${examResponses.firstAnsweredAt}, NOW())`
        : undefined,
      visitCount: sql`${examResponses.visitCount} + 1`,
    })
    .where(eq(examResponses.examQuestionId, data.examQuestionId))
    .returning();
  return response;
}

// Bulk sync answers
export async function bulkSyncAnswers(
  answers: {
    examQuestionId: string;
    selectedOption: string | null;
    status: string;
    timeSpentSec: number;
  }[],
) {
  for (const answer of answers) {
    await saveAnswer(answer);
  }
}

// Submit exam session
export async function submitExamSession(
  sessionId: string,
  submitType: "SUBMITTED" | "AUTO_SUBMITTED",
) {
  const [session] = await db
    .update(examSessions)
    .set({
      status: submitType,
      submittedAt: new Date(),
    })
    .where(eq(examSessions.id, sessionId))
    .returning();
  return session;
}

// Update session summary counts
export async function updateSessionSummary(sessionId: string) {
  const sessionQuestions = await db.query.examQuestions.findMany({
    where: eq(examQuestions.sessionId, sessionId),
    with: { response: true },
  });

  const stats = {
    totalAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalNotVisited: 0,
    totalMarkedReview: 0,
  };

  for (const examQ of sessionQuestions) {
    const r = examQ.response;
    if (!r) {
      stats.totalNotVisited++;
      continue;
    }
    if (r.status === "NOT_VISITED") stats.totalNotVisited++;
    if (r.status === "ANSWERED" || r.status === "ANSWERED_AND_MARKED")
      stats.totalAnswered++;
    if (r.status === "MARKED_FOR_REVIEW" || r.status === "ANSWERED_AND_MARKED")
      stats.totalMarkedReview++;
    if (r.isCorrect === true) stats.totalCorrect++;
    if (r.isCorrect === false) stats.totalIncorrect++;
  }

  await db
    .update(examSessions)
    .set(stats)
    .where(eq(examSessions.id, sessionId));
}
