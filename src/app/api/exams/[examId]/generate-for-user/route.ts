import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/server/data-access/users";
import { db } from "@/server/db";
import { generationJobs, examTopicConfigs, questions } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { tasks } from "@trigger.dev/sdk/v3";
import type { generateQuestionsTask } from "@/trigger/generate-questions";

// POST — Start generation job via Trigger.dev
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

    const userExamTag = `${examId}_${dbUser.id}`;

    // Check if questions already generated for this user
    const existing = await db.query.questions.findMany({
      where: eq(questions.generatedForExamId, userExamTag),
      columns: { id: true },
    });

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        data: { status: "COMPLETED", totalGenerated: existing.length },
      });
    }

    // Check if a job is already running
    const activeJob = await db.query.generationJobs.findFirst({
      where: and(
        eq(generationJobs.examId, examId),
        eq(generationJobs.userId, dbUser.id),
      ),
      orderBy: (j, { desc }) => [desc(j.createdAt)],
    });

    if (activeJob) {
      if (activeJob.status === "IN_PROGRESS" || activeJob.status === "PENDING") {
        return NextResponse.json({
          success: true,
          data: {
            status: activeJob.status,
            jobId: activeJob.id,
            completedTopics: activeJob.completedTopics,
            totalTopics: activeJob.totalTopics,
            currentTopic: activeJob.currentTopic,
            totalGenerated: activeJob.totalGenerated,
          },
        });
      }
      if (activeJob.status === "COMPLETED") {
        return NextResponse.json({
          success: true,
          data: {
            status: "COMPLETED",
            jobId: activeJob.id,
            totalGenerated: activeJob.totalGenerated,
          },
        });
      }
      // If FAILED, allow retry — fall through to create new job
    }

    // Get topic count
    const configs = await db.query.examTopicConfigs.findMany({
      where: eq(examTopicConfigs.examId, examId),
    });

    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No topics configured for this exam",
      }, { status: 400 });
    }

    // Create job record
    const [job] = await db.insert(generationJobs).values({
      examId,
      userId: dbUser.id,
      examTag: userExamTag,
      status: "PENDING",
      totalTopics: configs.length,
    }).returning();

    // Trigger the background job via Trigger.dev
    try {
      await tasks.trigger<typeof generateQuestionsTask>("generate-questions", {
        jobId: job.id,
        examId,
        examTag: userExamTag,
      });
      console.log(`[Trigger.dev] Kicked off job ${job.id} for exam ${examId}`);
    } catch (triggerError) {
      console.error("[Trigger.dev] Failed to trigger, falling back to direct:", triggerError);

      // Fallback: run generation directly (won't work on Vercel Hobby for large exams
      // but works for dev/testing)
      runGenerationDirectly(job.id, examId, userExamTag).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        status: "PENDING",
        jobId: job.id,
        totalTopics: configs.length,
      },
    });
  } catch (error) {
    console.error("Generation start failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}

// Fallback: run generation without Trigger.dev (fire-and-forget)
async function runGenerationDirectly(jobId: string, examId: string, examTag: string) {
  const { generateQuestionsForExam } = await import("@/server/services/exam-question-manager");

  await db
    .update(generationJobs)
    .set({ status: "IN_PROGRESS", startedAt: new Date() })
    .where(eq(generationJobs.id, jobId));

  try {
    const result = await generateQuestionsForExam(examId, {
      multiplier: 1,
      overrideExamTag: examTag,
    });

    await db
      .update(generationJobs)
      .set({
        status: "COMPLETED",
        totalGenerated: result.totalGenerated,
        totalFailed: result.totalFailed,
        completedTopics: result.questionIds.length > 0 ? 999 : 0,
        errors: result.errors,
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));
  } catch (err) {
    await db
      .update(generationJobs)
      .set({
        status: "FAILED",
        errors: [err instanceof Error ? err.message : "Unknown"],
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));
  }
}

// GET — Poll job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ success: false, error: "Missing jobId" }, { status: 400 });
  }

  const job = await db.query.generationJobs.findFirst({
    where: eq(generationJobs.id, jobId),
  });

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      status: job.status,
      totalTopics: job.totalTopics,
      completedTopics: job.completedTopics,
      totalGenerated: job.totalGenerated,
      totalFailed: job.totalFailed,
      currentTopic: job.currentTopic,
      errors: job.errors,
    },
  });
}
