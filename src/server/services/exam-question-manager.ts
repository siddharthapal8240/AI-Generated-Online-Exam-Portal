import { db } from "@/server/db";
import { questions, examTopicConfigs, topics } from "@/server/schema";
import { eq, and } from "drizzle-orm";
import { generateQuestions, validateQuestion } from "./question-generator";
import {
  fetchPyqsForTopic,
  getStoredPyqs,
  getStoredPyqCount,
  storePyqs,
} from "./pyq-fetcher";

export interface GenerationResult {
  examId: string;
  totalGenerated: number;
  totalFailed: number;
  pyqCount: number;
  aiCount: number;
  questionIds: string[];
  errors: string[];
}

// Fisher-Yates shuffle
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
 * Strategy:
 *   1. Check DB for existing PYQs for this topic
 *   2. If not enough PYQs, fetch from web via AI and store them
 *   3. Pick pyqPercentage% from PYQs, rest from AI-generated
 *   4. If PYQs not available at all, fill entirely with AI
 */
async function generateForTopic(
  examTag: string,
  config: any,
  topic: any,
): Promise<{
  generated: number;
  failed: number;
  pyqCount: number;
  aiCount: number;
  questionIds: string[];
  errors: string[];
}> {
  const result = {
    generated: 0,
    failed: 0,
    pyqCount: 0,
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
  const pyqPercentage = config.pyqPercentage ?? 25; // Default 25% PYQs
  const pyqTarget = Math.round((totalNeeded * pyqPercentage) / 100);
  const aiTarget = totalNeeded - pyqTarget;

  console.log(
    `[Topic: ${topic.name}] Need ${totalNeeded} questions (${pyqTarget} PYQ + ${aiTarget} AI)`,
  );

  // ─── Step 1: Get PYQs (from DB or fetch new ones) ──────────────────────

  let pyqsToUse: any[] = [];

  if (pyqTarget > 0) {
    // Check how many PYQs we already have stored for this topic
    const storedCount = await getStoredPyqCount(topic.id);
    console.log(`[Topic: ${topic.name}] ${storedCount} PYQs already in DB`);

    if (storedCount < pyqTarget) {
      // Not enough PYQs in DB — fetch more via AI web search
      console.log(
        `[Topic: ${topic.name}] Fetching ${pyqTarget * 2} PYQs from web...`,
      );
      try {
        const fetched = await fetchPyqsForTopic({
          topicName: topic.name,
          subjectSlug,
          difficulty: config.difficulty,
          count: pyqTarget * 2, // Fetch extra so we have variety for future exams
        });

        // Store fetched PYQs in DB for future use
        const storeResult = await storePyqs(
          fetched.questions,
          topic.id,
          config.difficulty,
          fetched.model,
        );
        console.log(
          `[Topic: ${topic.name}] Stored ${storeResult.stored} new PYQs, skipped ${storeResult.skipped} duplicates`,
        );
      } catch (fetchError) {
        console.error(
          `[Topic: ${topic.name}] PYQ fetch failed:`,
          fetchError instanceof Error ? fetchError.message : fetchError,
        );
        result.errors.push(
          `PYQ fetch failed for ${topic.name}, using AI-generated instead`,
        );
      }
    }

    // Now pick PYQs from DB (freshly stored + previously existing)
    const storedPyqs = await getStoredPyqs(topic.id, {
      difficulty: config.difficulty,
      limit: pyqTarget * 3, // Get more than needed for random selection
    });

    // Randomly pick the required number
    pyqsToUse = shuffle(storedPyqs).slice(0, pyqTarget);
    console.log(
      `[Topic: ${topic.name}] Using ${pyqsToUse.length} PYQs from DB`,
    );
  }

  // ─── Step 2: Assign PYQs to this exam ──────────────────────────────────

  for (const pyq of pyqsToUse) {
    try {
      // Create a copy linked to this exam
      const [inserted] = await db
        .insert(questions)
        .values({
          topicId: topic.id,
          source: "PYQ",
          questionText: pyq.questionText,
          optionA: pyq.optionA,
          optionB: pyq.optionB,
          optionC: pyq.optionC,
          optionD: pyq.optionD,
          correctOption: pyq.correctOption,
          explanation: pyq.explanation,
          difficulty: config.difficulty,
          pyqSource: pyq.pyqSource,
          pyqYear: pyq.pyqYear,
          aiModel: pyq.aiModel,
          generatedForExamId: examTag,
          tags: ["pyq"],
        })
        .returning();

      result.questionIds.push(inserted.id);
      result.generated++;
      result.pyqCount++;
    } catch (dbError) {
      result.failed++;
      result.errors.push(
        `DB error storing PYQ for ${topic.name}: ${dbError instanceof Error ? dbError.message : "unknown"}`,
      );
    }
  }

  // ─── Step 3: Generate remaining with AI ────────────────────────────────

  const aiNeeded = totalNeeded - result.generated;
  if (aiNeeded > 0) {
    console.log(
      `[Topic: ${topic.name}] Generating ${aiNeeded} AI questions...`,
    );
    try {
      const generated = await generateQuestions({
        subjectSlug,
        topicName: topic.name,
        difficulty: config.difficulty,
        count: aiNeeded,
      });

      const insertPromises = generated.questions.map(async (q) => {
        const validation = validateQuestion(q);
        if (!validation.valid) {
          result.failed++;
          result.errors.push(
            `Invalid AI question for ${topic.name}: ${validation.issues.join(", ")}`,
          );
          return;
        }

        try {
          const [inserted] = await db
            .insert(questions)
            .values({
              topicId: topic.id,
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
              generatedForExamId: examTag,
              tags: [],
            })
            .returning();

          result.questionIds.push(inserted.id);
          result.generated++;
          result.aiCount++;
        } catch (dbError) {
          result.failed++;
          result.errors.push(
            `DB error for ${topic.name}: ${dbError instanceof Error ? dbError.message : "unknown"}`,
          );
        }
      });

      await Promise.all(insertPromises);
    } catch (genError) {
      result.failed += aiNeeded;
      result.errors.push(
        `AI generation failed for ${topic.name}: ${genError instanceof Error ? genError.message : "unknown"}`,
      );
    }
  }

  console.log(
    `[Topic: ${topic.name}] Done: ${result.pyqCount} PYQs + ${result.aiCount} AI = ${result.generated} total`,
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
      pyqCount: 0,
      aiCount: 0,
      questionIds: [],
      errors: [
        "No topics configured for this exam. Select subjects/topics in the exam creation wizard.",
      ],
    };
  }

  const adjustedConfigs = topicConfigsList.map((config) => ({
    ...config,
    questionCount: config.questionCount * multiplier,
  }));

  console.log(
    `[Exam] Generating for ${adjustedConfigs.length} topics in parallel (${multiplier}x multiplier)...`,
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
    pyqCount: 0,
    aiCount: 0,
    questionIds: [],
    errors: [],
  };

  for (const tr of topicResults) {
    result.totalGenerated += tr.generated;
    result.totalFailed += tr.failed;
    result.pyqCount += tr.pyqCount;
    result.aiCount += tr.aiCount;
    result.questionIds.push(...tr.questionIds);
    result.errors.push(...tr.errors);
  }

  console.log(
    `[Exam] Done in ${elapsed}s: ${result.pyqCount} PYQs + ${result.aiCount} AI = ${result.totalGenerated} total`,
  );

  return result;
}
