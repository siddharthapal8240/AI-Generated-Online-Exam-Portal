import { NextRequest, NextResponse } from "next/server";
import { saveAnswer } from "@/server/data-access/sessions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { examQuestionId, selectedOption, status, timeSpentSec } = body;

    if (!examQuestionId) {
      return NextResponse.json(
        { success: false, error: "Missing examQuestionId" },
        { status: 400 },
      );
    }

    const response = await saveAnswer({
      examQuestionId,
      selectedOption: selectedOption || null,
      status: status || "ANSWERED",
      timeSpentSec: timeSpentSec || 0,
    });

    return NextResponse.json({
      success: true,
      data: { savedAt: Date.now() },
    });
  } catch (error) {
    console.error("Failed to save answer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save" },
      { status: 500 },
    );
  }
}
