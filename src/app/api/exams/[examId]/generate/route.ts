import { NextRequest, NextResponse } from "next/server";
import { generateQuestionsForExam } from "@/server/services/exam-question-manager";
import { getExamById } from "@/server/data-access/exams";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;

  // Verify exam exists
  const exam = await getExamById(examId);
  if (!exam) {
    return NextResponse.json(
      { success: false, error: "Exam not found" },
      { status: 404 },
    );
  }

  if (exam.status !== "DRAFT") {
    return NextResponse.json(
      { success: false, error: "Can only generate questions for draft exams" },
      { status: 400 },
    );
  }

  try {
    const result = await generateQuestionsForExam(examId);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Question generation failed:", error);
    return NextResponse.json(
      { success: false, error: "Question generation failed" },
      { status: 500 },
    );
  }
}
