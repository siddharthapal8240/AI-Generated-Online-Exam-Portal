import { NextRequest, NextResponse } from "next/server";
import { bulkSyncAnswers } from "@/server/data-access/sessions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const body = await request.json();
    const { answers } = body;

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: "Invalid answers array" },
        { status: 400 },
      );
    }

    await bulkSyncAnswers(answers);

    return NextResponse.json({
      success: true,
      data: { syncedAt: Date.now(), count: answers.length },
    });
  } catch (error) {
    console.error("Failed to sync:", error);
    return NextResponse.json(
      { success: false, error: "Sync failed" },
      { status: 500 },
    );
  }
}
