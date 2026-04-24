import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getExamById } from "@/server/data-access/exams";
import {
  createExamSession,
  getSessionByExamAndUser,
  assignQuestionsToSession,
} from "@/server/data-access/sessions";
import { ensureUser } from "@/server/data-access/users";
import { db } from "@/server/db";
import { questions } from "@/server/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examId } = body;

    if (!examId) {
      return NextResponse.json(
        { success: false, error: "Missing examId" },
        { status: 400 },
      );
    }

    // Get current user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Ensure user exists in our DB
    const dbUser = await ensureUser({
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      name:
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ||
        "User",
      role: "PARTICIPANT",
    });

    const userId = dbUser.id;

    // Check exam exists
    const exam = await getExamById(examId);
    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Exam not found" },
        { status: 404 },
      );
    }

    // Allow DRAFT and LIVE for now (DRAFT for testing)
    if (!["LIVE", "DRAFT", "SCHEDULED"].includes(exam.status)) {
      return NextResponse.json(
        { success: false, error: "Exam is not available" },
        { status: 400 },
      );
    }

    // Check if session already exists
    const existing = await getSessionByExamAndUser(examId, userId);
    if (existing) {
      if (existing.status === "IN_PROGRESS") {
        return NextResponse.json({
          success: true,
          data: {
            sessionId: existing.id,
            serverTime: Date.now(),
            expiresAt: existing.expiresAt?.getTime(),
            isReconnection: true,
          },
        });
      }
      if (
        existing.status === "SUBMITTED" ||
        existing.status === "AUTO_SUBMITTED"
      ) {
        return NextResponse.json(
          { success: false, error: "You have already submitted this exam" },
          { status: 409 },
        );
      }
    }

    // Calculate expiry
    const expiresAt = new Date(
      Date.now() + exam.durationMinutes * 60 * 1000,
    );

    // Create session
    const session = await createExamSession({ examId, userId, expiresAt });

    // Get questions generated for this exam
    const questionPool = await db.query.questions.findMany({
      where: and(
        eq(questions.generatedForExamId, examId),
        eq(questions.isActive, true),
      ),
    });

    if (questionPool.length === 0) {
      // Fallback: get any active questions
      const anyQuestions = await db.query.questions.findMany({
        where: eq(questions.isActive, true),
        limit: exam.totalQuestions,
      });

      if (anyQuestions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No questions available. Ask the admin to generate questions first.",
          },
          { status: 400 },
        );
      }

      await assignQuestionsToSession(
        session.id,
        anyQuestions.map((q) => ({
          id: q.id,
          marksForCorrect: exam.marksPerQuestion,
          marksForIncorrect: exam.negativeMarking,
        })),
      );
    } else {
      const selected = questionPool.slice(0, exam.totalQuestions);
      await assignQuestionsToSession(
        session.id,
        selected.map((q) => ({
          id: q.id,
          marksForCorrect: exam.marksPerQuestion,
          marksForIncorrect: exam.negativeMarking,
        })),
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        serverTime: Date.now(),
        expiresAt: expiresAt.getTime(),
        isReconnection: false,
      },
    });
  } catch (error) {
    console.error("Failed to start session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start session" },
      { status: 500 },
    );
  }
}
