import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getExamById } from "@/server/data-access/exams";
import {
  createExamSession,
  getSessionByExamAndUser,
  assignQuestionsToSession,
} from "@/server/data-access/sessions";
import { ensureUser } from "@/server/data-access/users";
import { generateQuestionsForExam } from "@/server/services/exam-question-manager";
import { db } from "@/server/db";
import { questions, examTopicConfigs } from "@/server/schema";
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
      return NextResponse.json(
        { success: false, error: "Missing examId" },
        { status: 400 },
      );
    }

    // Auth
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

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

    // Get exam
    const exam = await getExamById(examId);
    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Exam not found" },
        { status: 404 },
      );
    }

    if (!["LIVE", "DRAFT", "SCHEDULED"].includes(exam.status)) {
      return NextResponse.json(
        { success: false, error: "Exam is not available" },
        { status: 400 },
      );
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

    // Create session
    const expiresAt = new Date(Date.now() + exam.durationMinutes * 60 * 1000);
    const session = await createExamSession({ examId, userId, expiresAt });

    const questionMode = (exam as any).questionMode || "PRE_GENERATED";

    // ─── MODE: DYNAMIC — Generate fresh questions for THIS user ────────
    if (questionMode === "DYNAMIC") {
      console.log(`[Session] DYNAMIC mode — generating fresh questions for user ${userId}`);

      const genResult = await generateQuestionsForExam(examId);

      if (genResult.totalGenerated === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to generate questions: ${genResult.errors.join(", ")}`,
          },
          { status: 500 },
        );
      }

      // Use the freshly generated questions (they have generatedForExamId = examId)
      // But since multiple users generate to the same exam, we need to pick only this batch
      const freshQuestions = await db.query.questions.findMany({
        where: and(
          eq(questions.isActive, true),
          // Get questions created very recently for this exam
        ),
        orderBy: (q, { desc }) => [desc(q.createdAt)],
        limit: exam.totalQuestions,
      });

      // Actually, use the IDs returned from generation
      const questionIds = genResult.questionIds.slice(0, exam.totalQuestions);
      const generatedQuestions = await db.query.questions.findMany({
        where: and(
          eq(questions.isActive, true),
        ),
      });
      const selectedQuestions = generatedQuestions.filter((q) =>
        questionIds.includes(q.id),
      );

      if (selectedQuestions.length === 0) {
        return NextResponse.json(
          { success: false, error: "No questions generated" },
          { status: 500 },
        );
      }

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

    // ─── MODE: POOL_BASED — Pick random subset from pre-generated pool ─
    if (questionMode === "POOL_BASED") {
      console.log(`[Session] POOL_BASED mode — picking random subset for user ${userId}`);

      // Get all questions in the pool for this exam
      const pool = await db.query.questions.findMany({
        where: and(
          eq(questions.generatedForExamId, examId),
          eq(questions.isActive, true),
        ),
      });

      if (pool.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Question pool is empty. Admin needs to generate the question pool first.",
          },
          { status: 400 },
        );
      }

      // Get topic configs to maintain topic distribution
      const topicConfigs = await db.query.examTopicConfigs.findMany({
        where: eq(examTopicConfigs.examId, examId),
      });

      let selectedQuestions: typeof pool = [];

      if (topicConfigs.length > 0) {
        // Pick randomly per topic to maintain distribution
        for (const config of topicConfigs) {
          const topicQuestions = pool.filter(
            (q) => q.topicId === config.topicId,
          );
          const shuffled = shuffle(topicQuestions);
          selectedQuestions.push(
            ...shuffled.slice(0, config.questionCount),
          );
        }
      } else {
        // No topic configs, just pick randomly from full pool
        selectedQuestions = shuffle(pool).slice(0, exam.totalQuestions);
      }

      if (selectedQuestions.length === 0) {
        return NextResponse.json(
          { success: false, error: "Not enough questions in pool" },
          { status: 400 },
        );
      }

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

    // ─── MODE: PRE_GENERATED (default) — Same questions for all ────────
    console.log(`[Session] PRE_GENERATED mode — assigning existing questions`);

    const questionPool = await db.query.questions.findMany({
      where: and(
        eq(questions.generatedForExamId, examId),
        eq(questions.isActive, true),
      ),
    });

    if (questionPool.length === 0) {
      // Fallback
      const anyQuestions = await db.query.questions.findMany({
        where: eq(questions.isActive, true),
        limit: exam.totalQuestions,
      });

      if (anyQuestions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No questions available. Admin needs to generate questions first.",
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
