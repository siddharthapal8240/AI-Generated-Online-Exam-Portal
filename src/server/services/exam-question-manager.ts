import { db } from "@/server/db";
import { questions, examTopicConfigs, topics } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { validateQuestion } from "./question-generator";
import {
  fetchAndGenerateQuestions,
  storePyqsInBank,
  getPyqsFromBank,
  isDuplicate,
} from "./pyq-fetcher";

export interface GenerationResult {
  examId: string;
  totalGenerated: number;
  totalFailed: number;
  pyqDirectCount: number;
  pyqVariantCount: number;
  aiCount: number;
  questionIds: string[];
  errors: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate questions for a single topic.
 *
 * Strategy (EVERY time, always fresh):
 *   1. Call AI to fetch real PYQs from web + create variants + generate AI questions
 *   2. Store ALL fetched PYQs in the permanent question bank (deduped)
 *   3. For this exam: pick 20% direct PYQ + 20% PYQ variants + 60% AI exam-level
 *   4. Each question tagged with examTag so it's linked to this specific exam/user
 */
async function generateForTopic(
  examTag: string,
  config: any,
  topic: any,
): Promise<{
  generated: number;
  failed: number;
  pyqDirectCount: number;
  pyqVariantCount: number;
  aiCount: number;
  questionIds: string[];
  errors: string[];
}> {
  const result = {
    generated: 0,
    failed: 0,
    pyqDirectCount: 0,
    pyqVariantCount: 0,
    aiCount: 0,
    questionIds: [] as string[],
    errors: [] as string[],
  };

  // Resolve parent subject slug
  let subjectSlug = topic.slug;
  if (topic.parentId) {
    const parent = await db.query.topics.findFirst({
      where: eq(topics.id, topic.parentId),
    });
    if (parent) subjectSlug = parent.slug;
  }

  const totalNeeded = config.questionCount;
  const pyqPercentage = config.pyqPercentage ?? 40; // 40% total PYQ (20% direct + 20% variant)
  const pyqDirectPercent = Math.round(pyqPercentage / 2); // 20% direct PYQ
  const pyqVariantPercent = pyqPercentage - pyqDirectPercent; // 20% variant

  console.log(
    `[${topic.name}] Fetching & generating ${totalNeeded} questions (${pyqDirectPercent}% direct PYQ + ${pyqVariantPercent}% variant + ${100 - pyqPercentage}% AI)`,
  );

  try {
    // ─── Step 1: Fetch fresh PYQs + variants + AI questions from AI ─────

    const fetched = await fetchAndGenerateQuestions({
      topicName: topic.name,
      subjectSlug,
      difficulty: config.difficulty,
      totalCount: totalNeeded,
      pyqDirectPercent,
      pyqVariantPercent,
    });

    console.log(
      `[${topic.name}] AI returned ${fetched.questions.length} questions`,
    );

    // ─── Step 2: Store ALL in permanent bank (deduped) ──────────────────

    const bankResult = await storePyqsInBank(
      fetched.questions,
      topic.id,
      config.difficulty,
      fetched.model,
    );

    console.log(
      `[${topic.name}] Stored ${bankResult.stored.length} in bank, skipped ${bankResult.skipped} duplicates`,
    );

    // ─── Step 3: Create exam-specific copies linked to this exam/user ───

    for (const q of fetched.questions) {
      const validation = validateQuestion({
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation,
      });

      if (!validation.valid) {
        result.failed++;
        result.errors.push(
          `Invalid question for ${topic.name}: ${validation.issues.join(", ")}`,
        );
        continue;
      }

      const source =
        q.questionType === "DIRECT_PYQ" || q.questionType === "PYQ_VARIANT"
          ? "PYQ"
          : "AI_GENERATED";

      const tags: string[] = [];
      if (q.questionType === "DIRECT_PYQ") tags.push("pyq", "direct");
      if (q.questionType === "PYQ_VARIANT") tags.push("pyq", "variant");
      if (q.questionType === "AI_EXAM_LEVEL") tags.push("ai", "exam-level");

      try {
        const [inserted] = await db
          .insert(questions)
          .values({
            topicId: topic.id,
            source: source as any,
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            explanation: q.explanation,
            difficulty: config.difficulty,
            pyqSource: q.sourceExam,
            pyqYear: q.year,
            aiModel: fetched.model,
            generatedForExamId: examTag,
            tags,
          })
          .returning();

        result.questionIds.push(inserted.id);
        result.generated++;

        if (q.questionType === "DIRECT_PYQ") result.pyqDirectCount++;
        else if (q.questionType === "PYQ_VARIANT") result.pyqVariantCount++;
        else result.aiCount++;
      } catch (dbError) {
        result.failed++;
        result.errors.push(
          `DB error for ${topic.name}: ${dbError instanceof Error ? dbError.message : "unknown"}`,
        );
      }
    }
  } catch (genError) {
    result.failed += totalNeeded;
    result.errors.push(
      `Generation failed for ${topic.name}: ${genError instanceof Error ? genError.message : "unknown"}`,
    );
  }

  console.log(
    `[${topic.name}] Done: ${result.pyqDirectCount} direct PYQ + ${result.pyqVariantCount} variants + ${result.aiCount} AI = ${result.generated} total`,
  );

  return result;
}

export async function generateQuestionsForExam(
  examId: string,
  options?: { multiplier?: number; overrideExamTag?: string },
): Promise<GenerationResult> {
  const multiplier = options?.multiplier || 1;
  const examTag = options?.overrideExamTag || examId;

  const topicConfigsList = await db.query.examTopicConfigs.findMany({
    where: eq(examTopicConfigs.examId, examId),
    with: { topic: true },
  });

  if (topicConfigsList.length === 0) {
    return {
      examId,
      totalGenerated: 0,
      totalFailed: 0,
      pyqDirectCount: 0,
      pyqVariantCount: 0,
      aiCount: 0,
      questionIds: [],
      errors: [
        "No topics configured. Select subjects/topics in exam creation wizard.",
      ],
    };
  }

  const adjustedConfigs = topicConfigsList.map((config) => ({
    ...config,
    questionCount: config.questionCount * multiplier,
  }));

  console.log(
    `[Exam] Generating for ${adjustedConfigs.length} topics in parallel (${multiplier}x)...`,
  );
  const startTime = Date.now();

  const topicResults = await Promise.all(
    adjustedConfigs
      .filter((config) => config.topic)
      .map((config) => generateForTopic(examTag, config, config.topic)),
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const result: GenerationResult = {
    examId,
    totalGenerated: 0,
    totalFailed: 0,
    pyqDirectCount: 0,
    pyqVariantCount: 0,
    aiCount: 0,
    questionIds: [],
    errors: [],
  };

  for (const tr of topicResults) {
    result.totalGenerated += tr.generated;
    result.totalFailed += tr.failed;
    result.pyqDirectCount += tr.pyqDirectCount;
    result.pyqVariantCount += tr.pyqVariantCount;
    result.aiCount += tr.aiCount;
    result.questionIds.push(...tr.questionIds);
    result.errors.push(...tr.errors);
  }

  console.log(
    `[Exam] Done in ${elapsed}s: ${result.pyqDirectCount} direct PYQ + ${result.pyqVariantCount} variants + ${result.aiCount} AI = ${result.totalGenerated} total`,
  );

  return result;
}
