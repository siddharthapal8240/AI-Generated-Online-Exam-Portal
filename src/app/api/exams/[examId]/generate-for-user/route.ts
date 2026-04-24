import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/server/data-access/users";
import { getExamById } from "@/server/data-access/exams";
import { generateQuestionsForExam } from "@/server/services/exam-question-manager";

export const maxDuration = 60; // Allow up to 60s on Vercel Pro

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  try {
    const { examId } = await params;

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const dbUser = await ensureUser({
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
      role: "PARTICIPANT",
    });

    const exam = await getExamById(examId);
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    // Generate questions tagged with examId_userId so they're unique to this user
    const userExamTag = `${examId}_${dbUser.id}`;

    console.log(`[Dynamic] Generating questions for user ${dbUser.id}, tag: ${userExamTag}`);

    // Override the examId in generation to use the user-specific tag
    const result = await generateQuestionsForExam(examId, {
      multiplier: 1,
      overrideExamTag: userExamTag,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalGenerated: result.totalGenerated,
        totalFailed: result.totalFailed,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("Dynamic generation failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
