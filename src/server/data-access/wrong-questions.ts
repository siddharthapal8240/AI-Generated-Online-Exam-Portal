import { db } from "@/server/db";
import {
  examSessions,
  examQuestions,
  examResponses,
  examResults,
} from "@/server/schema";
import { eq, and } from "drizzle-orm";

export interface WrongQuestion {
  examQuestionId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  selectedOption: string | null;
  explanation: string;
  difficulty: string;
  topicName: string;
  topicId: string;
  source: string;
  pyqSource: string | null;
  pyqYear: number | null;
  tags: string[] | null;
  timeSpentSec: number;
  examTitle: string;
  examId: string;
  attemptedAt: string;
}

/**
 * Get all wrong + skipped questions for a user across all exams.
 */
export async function getWrongQuestions(
  userId: string,
  filters?: { topicId?: string; examId?: string },
): Promise<WrongQuestion[]> {
  // Get all sessions for this user
  const sessions = await db.query.examSessions.findMany({
    where: and(
      eq(examSessions.userId, userId),
      // Only completed exams
    ),
    with: {
      exam: { columns: { id: true, title: true } },
      examQuestions: {
        with: {
          question: {
            with: { topic: true },
          },
          response: true,
        },
      },
    },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  const wrongQuestions: WrongQuestion[] = [];

  for (const session of sessions) {
    // Only include submitted sessions
    if (
      session.status !== "SUBMITTED" &&
      session.status !== "AUTO_SUBMITTED"
    ) {
      continue;
    }

    for (const eq of session.examQuestions) {
      const response = eq.response;
      const question = eq.question;

      if (!question || !response) continue;

      // Include wrong answers and skipped questions
      const isWrong = response.selectedOption && response.isCorrect === false;
      const isSkipped = !response.selectedOption;

      if (!isWrong && !isSkipped) continue;

      // Apply filters
      if (filters?.topicId && question.topicId !== filters.topicId) continue;
      if (filters?.examId && session.examId !== filters.examId) continue;

      wrongQuestions.push({
        examQuestionId: eq.id,
        questionText: question.questionText,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctOption: question.correctOption,
        selectedOption: response.selectedOption,
        explanation: question.explanation || "",
        difficulty: question.difficulty,
        topicName: question.topic?.name || "Unknown",
        topicId: question.topicId,
        source: question.source,
        pyqSource: question.pyqSource,
        pyqYear: question.pyqYear,
        tags: question.tags,
        timeSpentSec: response.totalTimeSec || 0,
        examTitle: session.exam.title,
        examId: session.examId,
        attemptedAt: session.createdAt.toISOString(),
      });
    }
  }

  return wrongQuestions;
}

/**
 * Get summary stats for wrong questions.
 */
export async function getWrongQuestionStats(userId: string) {
  const allWrong = await getWrongQuestions(userId);

  // Group by topic
  const topicMap = new Map<
    string,
    { name: string; wrong: number; skipped: number }
  >();
  let totalWrong = 0;
  let totalSkipped = 0;

  for (const q of allWrong) {
    const existing = topicMap.get(q.topicId) || {
      name: q.topicName,
      wrong: 0,
      skipped: 0,
    };
    if (q.selectedOption) {
      existing.wrong++;
      totalWrong++;
    } else {
      existing.skipped++;
      totalSkipped++;
    }
    topicMap.set(q.topicId, existing);
  }

  // Group by exam
  const examMap = new Map<string, { title: string; count: number }>();
  for (const q of allWrong) {
    const existing = examMap.get(q.examId) || { title: q.examTitle, count: 0 };
    existing.count++;
    examMap.set(q.examId, existing);
  }

  return {
    totalWrong,
    totalSkipped,
    total: allWrong.length,
    byTopic: Array.from(topicMap.entries())
      .map(([id, data]) => ({ topicId: id, ...data }))
      .sort((a, b) => b.wrong + b.skipped - (a.wrong + a.skipped)),
    byExam: Array.from(examMap.entries())
      .map(([id, data]) => ({ examId: id, ...data }))
      .sort((a, b) => b.count - a.count),
  };
}
