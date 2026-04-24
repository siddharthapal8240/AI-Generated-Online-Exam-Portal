import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/server/data-access/users";
import { db } from "@/server/db";
import { generationJobs, examTopicConfigs, topics, questions } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { generateQuestions, validateQuestion } from "@/server/services/question-generator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  try {
    const { examId } = await params;
    const body = await request.json().catch(() => ({}));
    const { topicConfigId, action } = body;

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

    // ─── ACTION: start — Create job and return topic list for sequential generation ───
    if (action === "start" || !topicConfigId) {
      // Check if questions already generated
      const existing = await db.query.questions.findMany({
        where: eq(questions.generatedForExamId, userExamTag),
        columns: { id: true },
      });

      if (existing.length > 0) {
        return NextResponse.json({
          success: true,
          data: { status: "ALREADY_DONE", totalGenerated: existing.length },
        });
      }

      // Check if a job is already running
      const activeJob = await db.query.generationJobs.findFirst({
        where: and(
          eq(generationJobs.examId, examId),
          eq(generationJobs.userId, dbUser.id),
          eq(generationJobs.status, "IN_PROGRESS"),
        ),
      });

      if (activeJob) {
        return NextResponse.json({
          success: true,
          data: {
            status: "IN_PROGRESS",
            jobId: activeJob.id,
            completedTopics: activeJob.completedTopics,
            totalTopics: activeJob.totalTopics,
            currentTopic: activeJob.currentTopic,
          },
        });
      }

      // Get topic configs
      const configs = await db.query.examTopicConfigs.findMany({
        where: eq(examTopicConfigs.examId, examId),
        with: { topic: true },
      });

      if (configs.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No topics configured for this exam",
        }, { status: 400 });
      }

      // Create a job record
      const [job] = await db.insert(generationJobs).values({
        examId,
        userId: dbUser.id,
        examTag: userExamTag,
        status: "PENDING",
        totalTopics: configs.length,
      }).returning();

      // Return topic configs for the client to generate one by one
      return NextResponse.json({
        success: true,
        data: {
          status: "READY",
          jobId: job.id,
          topics: configs.map((c) => ({
            configId: c.id,
            topicName: c.topic?.name || "Unknown",
            questionCount: c.questionCount,
          })),
        },
      });
    }

    // ─── ACTION: generate — Generate for ONE topic (fits in 10s) ───
    // Mark job as in progress
    const jobRecord = await db.query.generationJobs.findFirst({
      where: and(
        eq(generationJobs.examId, examId),
        eq(generationJobs.userId, dbUser.id),
      ),
      orderBy: (j, { desc }) => [desc(j.createdAt)],
    });

    if (jobRecord && jobRecord.status === "PENDING") {
      await db
        .update(generationJobs)
        .set({ status: "IN_PROGRESS", startedAt: new Date() })
        .where(eq(generationJobs.id, jobRecord.id));
    }

    const config = await db.query.examTopicConfigs.findFirst({
      where: eq(examTopicConfigs.id, topicConfigId),
      with: { topic: true },
    });

    if (!config || !config.topic) {
      return NextResponse.json({ success: false, error: "Topic config not found" }, { status: 404 });
    }

    // Update current topic in job
    if (jobRecord) {
      await db
        .update(generationJobs)
        .set({ currentTopic: config.topic.name })
        .where(eq(generationJobs.id, jobRecord.id));
    }

    // Find parent slug
    let subjectSlug = config.topic.slug;
    if (config.topic.parentId) {
      const parent = await db.query.topics.findFirst({
        where: eq(topics.id, config.topic.parentId),
      });
      if (parent) subjectSlug = parent.slug;
    }

    // Generate
    const generated = await generateQuestions({
      subjectSlug,
      topicName: config.topic.name,
      difficulty: config.difficulty,
      count: config.questionCount,
    });

    let stored = 0;
    let failed = 0;

    for (const q of generated.questions) {
      const validation = validateQuestion(q);
      if (!validation.valid) {
        failed++;
        continue;
      }

      await db.insert(questions).values({
        topicId: config.topic.id,
        source: "AI_GENERATED",
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation,
        difficulty: config.difficulty,
        aiModel: generated.model,
        generatedForExamId: userExamTag,
        tags: [],
      });
      stored++;
    }

    // Update job progress
    if (jobRecord) {
      const completedTopics = (jobRecord.completedTopics || 0) + 1;
      const totalGenerated = (jobRecord.totalGenerated || 0) + stored;
      const totalFailed = (jobRecord.totalFailed || 0) + failed;
      const isLast = completedTopics >= jobRecord.totalTopics;

      await db
        .update(generationJobs)
        .set({
          completedTopics,
          totalGenerated,
          totalFailed,
          currentTopic: isLast ? null : undefined,
          status: isLast ? "COMPLETED" : "IN_PROGRESS",
          completedAt: isLast ? new Date() : undefined,
        })
        .where(eq(generationJobs.id, jobRecord.id));
    }

    return NextResponse.json({
      success: true,
      data: {
        topicName: config.topic.name,
        generated: stored,
        failed,
      },
    });
  } catch (error) {
    console.error("Generation failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
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
