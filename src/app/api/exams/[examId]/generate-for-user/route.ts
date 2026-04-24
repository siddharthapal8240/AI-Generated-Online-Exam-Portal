import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ensureUser } from "@/server/data-access/users";
import { getExamById } from "@/server/data-access/exams";
import { db } from "@/server/db";
import { examTopicConfigs, topics, questions } from "@/server/schema";
import { eq } from "drizzle-orm";
import { generateQuestions, validateQuestion } from "@/server/services/question-generator";

// Generate questions for ONE topic at a time — fits within Vercel Hobby 10s limit
// Client calls this repeatedly for each topic

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  try {
    const { examId } = await params;
    const body = await request.json();
    const { topicConfigId } = body; // Which topic config to generate for

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

    // If no topicConfigId provided, return the list of topic configs to generate
    if (!topicConfigId) {
      const configs = await db.query.examTopicConfigs.findMany({
        where: eq(examTopicConfigs.examId, examId),
        with: { topic: true },
      });

      // Check which ones already have questions generated for this user
      const existingQuestions = await db.query.questions.findMany({
        where: eq(questions.generatedForExamId, userExamTag),
        columns: { topicId: true },
      });
      const generatedTopicIds = new Set(existingQuestions.map((q) => q.topicId));

      const pending = configs.filter((c) => !generatedTopicIds.has(c.topicId));

      return NextResponse.json({
        success: true,
        data: {
          total: configs.length,
          pending: pending.length,
          completed: configs.length - pending.length,
          configs: pending.map((c) => ({
            id: c.id,
            topicId: c.topicId,
            topicName: c.topic?.name || "Unknown",
            questionCount: c.questionCount,
            difficulty: c.difficulty,
          })),
        },
      });
    }

    // Generate for a specific topic config
    const config = await db.query.examTopicConfigs.findFirst({
      where: eq(examTopicConfigs.id, topicConfigId),
      with: { topic: true },
    });

    if (!config || !config.topic) {
      return NextResponse.json({ success: false, error: "Topic config not found" }, { status: 404 });
    }

    // Find parent subject slug
    let subjectSlug = config.topic.slug;
    if (config.topic.parentId) {
      const parent = await db.query.topics.findFirst({
        where: eq(topics.id, config.topic.parentId),
      });
      if (parent) subjectSlug = parent.slug;
    }

    // Generate questions for this one topic
    const generated = await generateQuestions({
      subjectSlug,
      topicName: config.topic.name,
      difficulty: config.difficulty,
      count: config.questionCount,
    });

    // Validate and store
    let stored = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const q of generated.questions) {
      const validation = validateQuestion(q);
      if (!validation.valid) {
        failed++;
        errors.push(`Invalid: ${validation.issues.join(", ")}`);
        continue;
      }

      try {
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
      } catch (e) {
        failed++;
        errors.push(`DB error: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        topicName: config.topic.name,
        generated: stored,
        failed,
        errors,
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
