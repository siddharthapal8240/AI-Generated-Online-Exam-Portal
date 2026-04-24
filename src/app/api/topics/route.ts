import { NextResponse } from "next/server";
import { getTopicsWithChildren } from "@/server/data-access/topics";

export async function GET() {
  try {
    const topics = await getTopicsWithChildren();
    return NextResponse.json({ success: true, data: topics });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch topics" },
      { status: 500 },
    );
  }
}
