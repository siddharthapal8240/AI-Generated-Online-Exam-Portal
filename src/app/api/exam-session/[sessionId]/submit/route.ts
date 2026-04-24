import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { examSessions } from "@/server/schema";
import { eq } from "drizzle-orm";
import { calculateAndSaveScore } from "@/server/services/score-calculator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { submitType } = body;

    // Quick check — just get session status, don't load everything
    const session = await db.query.examSessions.findFirst({
      where: eq(examSessions.id, sessionId),
      columns: { id: true, status: true, examId: true },
      with: { exam: { columns: { showResultInstantly: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    if (session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, error: "Session already submitted" },
        { status: 409 },
      );
    }

    // Mark session as submitted first (fast)
    const type = submitType === "auto" ? "AUTO_SUBMITTED" : "SUBMITTED";
    await db
      .update(examSessions)
      .set({ status: type, submittedAt: new Date() })
      .where(eq(examSessions.id, sessionId));

    // Calculate score
    const scoreResult = await calculateAndSaveScore(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        submittedAt: Date.now(),
        submitType: type,
        score: session.exam.showResultInstantly ? scoreResult : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to submit:", error);
    return NextResponse.json(
      { success: false, error: "Submission failed" },
      { status: 500 },
    );
  }
}
