import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getExamById } from "@/server/data-access/exams";
import {
  createExamSession,
  getSessionByExamAndUser,
  assignQuestionsToSession,
} from "@/server/data-access/sessions";
import { ensureUser } from "@/server/data-access/users";
import { db } from "@/server/db";
import { questions, examTopicConfigs, examSessions } from "@/server/schema";
import { eq, and } from "drizzle-orm";

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examId } = body;

    if (!examId) {
      return NextResponse.json({ success: false, error: "Missing examId" }, { status: 400 });
    }

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

    const userId = dbUser.id;
    const exam = await getExamById(examId);
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    if (!["LIVE", "DRAFT", "SCHEDULED"].includes(exam.status)) {
      return NextResponse.json({ success: false, error: "Exam is not available" }, { status: 400 });
    }

    // Check existing session
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
      if (existing.status === "SUBMITTED" || existing.status === "AUTO_SUBMITTED") {
        return NextResponse.json(
          { success: false, error: "You have already submitted this exam" },
          { status: 409 },
        );
      }
    }

    const questionMode = (exam as any).questionMode || "PRE_GENERATED";

    // For DYNAMIC mode — questions must be generated first via /api/exams/[examId]/generate-for-user
    // This route only assigns already-existing questions
    if (questionMode === "DYNAMIC") {
      // Check if questions were generated for this user (stored with a user-specific tag)
      // For dynamic, the client calls generate-for-user FIRST, then calls this route
      const generatedQuestions = await db.query.questions.findMany({
        where: and(
          eq(questions.generatedForExamId, `${examId}_${userId}`),
          eq(questions.isActive, true),
        ),
      });

      if (generatedQuestions.length === 0) {
        return NextResponse.json(
          { success: false, error: "NEEDS_GENERATION", needsGeneration: true },
          { status: 400 },
        );
      }

      const expiresAt = new Date(Date.now() + exam.durationMinutes * 60 * 1000);
      const session = await createExamSession({ examId, userId, expiresAt });

      await assignQuestionsToSession(
        session.id,
        generatedQuestions.slice(0, exam.totalQuestions).map((q) => ({
          id: q.id,
          marksForCorrect: exam.marksPerQuestion,
          marksForIncorrect: exam.negativeMarking,
        })),
      );

      return NextResponse.json({
        success: true,
        data: {
          sessionId: session.id,
          serverTime: Date.now(),
          expiresAt: expiresAt.getTime(),
          isReconnection: false,
        },
      });
    }

    // POOL_BASED — pick random subset from pre-generated pool
    if (questionMode === "POOL_BASED") {
      const pool = await db.query.questions.findMany({
        where: and(
          eq(questions.generatedForExamId, examId),
          eq(questions.isActive, true),
        ),
      });

      if (pool.length === 0) {
        return NextResponse.json(
          { success: false, error: "Question pool is empty. Admin needs to generate questions first." },
          { status: 400 },
        );
      }

      const topicConfigs = await db.query.examTopicConfigs.findMany({
        where: eq(examTopicConfigs.examId, examId),
      });

      let selectedQuestions: typeof pool = [];
      if (topicConfigs.length > 0) {
        for (const config of topicConfigs) {
          const topicQuestions = pool.filter((q) => q.topicId === config.topicId);
          selectedQuestions.push(...shuffle(topicQuestions).slice(0, config.questionCount));
        }
      } else {
        selectedQuestions = shuffle(pool).slice(0, exam.totalQuestions);
      }

      if (selectedQuestions.length === 0) {
        return NextResponse.json({ success: false, error: "Not enough questions in pool" }, { status: 400 });
      }

      const expiresAt = new Date(Date.now() + exam.durationMinutes * 60 * 1000);
      const session = await createExamSession({ examId, userId, expiresAt });

      await assignQuestionsToSession(
        session.id,
        selectedQuestions.map((q) => ({
          id: q.id,
          marksForCorrect: exam.marksPerQuestion,
          marksForIncorrect: exam.negativeMarking,
        })),
      );

      return NextResponse.json({
        success: true,
        data: {
          sessionId: session.id,
          serverTime: Date.now(),
          expiresAt: expiresAt.getTime(),
          isReconnection: false,
        },
      });
    }

    // PRE_GENERATED (default) — same questions for all
    const questionPool = await db.query.questions.findMany({
      where: and(
        eq(questions.generatedForExamId, examId),
        eq(questions.isActive, true),
      ),
    });

    const toAssign = questionPool.length > 0
      ? questionPool.slice(0, exam.totalQuestions)
      : await db.query.questions.findMany({
          where: eq(questions.isActive, true),
          limit: exam.totalQuestions,
        });

    if (toAssign.length === 0) {
      return NextResponse.json(
        { success: false, error: "No questions available. Admin needs to generate questions first." },
        { status: 400 },
      );
    }

    const expiresAt = new Date(Date.now() + exam.durationMinutes * 60 * 1000);
    const session = await createExamSession({ examId, userId, expiresAt });

    await assignQuestionsToSession(
      session.id,
      toAssign.map((q) => ({
        id: q.id,
        marksForCorrect: exam.marksPerQuestion,
        marksForIncorrect: exam.negativeMarking,
      })),
    );

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
    return NextResponse.json({ success: false, error: "Failed to start session" }, { status: 500 });
  }
}
