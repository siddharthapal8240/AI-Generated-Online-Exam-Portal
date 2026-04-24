import { db } from "@/server/db";
import {
  examQuestions,
  examResponses,
  examResults,
  examSessions,
} from "@/server/schema";
import { eq } from "drizzle-orm";

export interface ScoreResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  positiveMarks: number;
  negativeMarks: number;
  totalTimeSec: number;
  avgTimePerQuestionSec: number;
  fastestQuestionSec: number;
  slowestQuestionSec: number;
}

export async function calculateAndSaveScore(
  sessionId: string,
): Promise<ScoreResult> {
  const session = await db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
    with: { exam: true },
  });

  if (!session) throw new Error("Session not found");

  const sessionQuestions = await db.query.examQuestions.findMany({
    where: eq(examQuestions.sessionId, sessionId),
    with: {
      question: { columns: { correctOption: true } },
      response: true,
    },
  });

  let totalScore = 0;
  let positiveMarks = 0;
  let negativeMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;
  let maxPossibleScore = 0;
  let totalTimeSec = 0;
  let fastestSec = Infinity;
  let slowestSec = 0;

  // Calculate scores in memory first, then batch update
  const responseUpdates: { id: string; isCorrect: boolean; marksAwarded: number }[] = [];

  for (const examQ of sessionQuestions) {
    maxPossibleScore += examQ.marksForCorrect;
    const response = examQ.response;

    if (!response || !response.selectedOption) {
      unattemptedCount++;
      continue;
    }

    const timeSec = response.totalTimeSec || 0;
    totalTimeSec += timeSec;
    if (timeSec > 0 && timeSec < fastestSec) fastestSec = timeSec;
    if (timeSec > slowestSec) slowestSec = timeSec;

    const isCorrect = response.selectedOption === examQ.question.correctOption;

    responseUpdates.push({
      id: response.id,
      isCorrect,
      marksAwarded: isCorrect ? examQ.marksForCorrect : -examQ.marksForIncorrect,
    });

    if (isCorrect) {
      correctCount++;
      positiveMarks += examQ.marksForCorrect;
      totalScore += examQ.marksForCorrect;
    } else {
      incorrectCount++;
      negativeMarks += examQ.marksForIncorrect;
      totalScore -= examQ.marksForIncorrect;
    }
  }

  if (fastestSec === Infinity) fastestSec = 0;
  const answeredCount = correctCount + incorrectCount;
  const avgTime = answeredCount > 0 ? totalTimeSec / answeredCount : 0;
  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  const isPassed = session.exam.passingPercentage
    ? percentage >= session.exam.passingPercentage
    : null;

  // Batch update responses (parallel)
  await Promise.all(
    responseUpdates.map((u) =>
      db
        .update(examResponses)
        .set({ isCorrect: u.isCorrect, marksAwarded: u.marksAwarded })
        .where(eq(examResponses.id, u.id)),
    ),
  );

  const scoreResult: ScoreResult = {
    totalScore: Math.max(0, totalScore),
    maxPossibleScore,
    percentage: Math.max(0, percentage),
    correctCount,
    incorrectCount,
    unattemptedCount,
    positiveMarks,
    negativeMarks,
    totalTimeSec: Math.round(totalTimeSec),
    avgTimePerQuestionSec: Math.round(avgTime * 10) / 10,
    fastestQuestionSec: Math.round(fastestSec * 10) / 10,
    slowestQuestionSec: Math.round(slowestSec * 10) / 10,
  };

  // Save result + update session (parallel)
  await Promise.all([
    db
      .insert(examResults)
      .values({
        examId: session.examId,
        userId: session.userId,
        sessionId,
        ...scoreResult,
        isPassed,
      })
      .onConflictDoNothing(),
    db
      .update(examSessions)
      .set({
        totalAnswered: answeredCount,
        totalCorrect: correctCount,
        totalIncorrect: incorrectCount,
        totalNotVisited: unattemptedCount,
        totalTimeSec: Math.round(totalTimeSec),
      })
      .where(eq(examSessions.id, sessionId)),
  ]);

  return scoreResult;
}
