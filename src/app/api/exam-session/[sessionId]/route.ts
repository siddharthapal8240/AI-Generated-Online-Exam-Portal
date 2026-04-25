import { NextRequest, NextResponse } from "next/server";
import { getExamSession } from "@/server/data-access/sessions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const session = await getExamSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Session not found" },
      { status: 404 },
    );
  }

  // Don't send correct answers during active session
  const questionsData = session.examQuestions.map((eq) => ({
    examQuestionId: eq.id,
    sequenceNumber: eq.sequenceNumber,
    questionId: eq.question.id,
    questionText: eq.question.questionText,
    optionA: eq.question.optionA,
    optionB: eq.question.optionB,
    optionC: eq.question.optionC,
    optionD: eq.question.optionD,
    difficulty: eq.question.difficulty,
    topicId: eq.question.topicId,
    source: eq.question.source,
    pyqSource: eq.question.pyqSource,
    pyqYear: eq.question.pyqYear,
    tags: eq.question.tags,
    // Response state
    selectedOption: eq.response?.selectedOption || null,
    status: eq.response?.status || "NOT_VISITED",
    timeSpentSec: eq.response?.totalTimeSec || 0,
  }));

  return NextResponse.json({
    success: true,
    data: {
      sessionId: session.id,
      examId: session.examId,
      examTitle: session.exam.title,
      examInstructions: session.exam.instructions,
      status: session.status,
      startedAt: session.startedAt?.getTime(),
      expiresAt: session.expiresAt?.getTime(),
      serverTime: Date.now(),
      durationMinutes: session.exam.durationMinutes,
      totalQuestions: session.examQuestions.length,
      marksPerQuestion: session.exam.marksPerQuestion,
      negativeMarking: session.exam.negativeMarking,
      showResultInstantly: session.exam.showResultInstantly,
      questions: questionsData,
    },
  });
}
