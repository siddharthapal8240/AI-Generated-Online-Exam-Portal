import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { examSessions, users } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { getExamById } from "@/server/data-access/exams";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
    columns: { id: true, name: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const exam = await getExamById(examId);
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  // Get ONLY this user's session
  const session = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.examId, examId),
      eq(examSessions.userId, dbUser.id),
    ),
    with: {
      examQuestions: {
        orderBy: (eqCol, { asc }) => [asc(eqCol.sequenceNumber)],
        with: {
          question: true,
          response: true,
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "No session found" }, { status: 404 });
  }

  const userName =
    dbUser.name ||
    `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
    "Participant";

  // Return structured JSON for client-side PDF generation
  return NextResponse.json({
    examTitle: exam.title,
    userName,
    duration: exam.durationMinutes,
    totalMarks: exam.totalMarks,
    totalCorrect: session.totalCorrect || 0,
    totalIncorrect: session.totalIncorrect || 0,
    totalSkipped: session.totalNotVisited || 0,
    questions: session.examQuestions.map((eq) => ({
      sequenceNumber: eq.sequenceNumber,
      questionText: eq.question.questionText,
      optionA: eq.question.optionA,
      optionB: eq.question.optionB,
      optionC: eq.question.optionC,
      optionD: eq.question.optionD,
      correctOption: eq.question.correctOption,
      selectedOption: eq.response?.selectedOption || null,
      isCorrect: eq.response?.isCorrect ?? null,
      explanation: eq.question.explanation || "",
      difficulty: eq.question.difficulty,
      source: eq.question.source,
      pyqSource: eq.question.pyqSource,
      timeSec: eq.response?.totalTimeSec || 0,
    })),
  });
}
