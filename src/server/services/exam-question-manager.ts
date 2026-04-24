import { db } from "@/server/db";
import { questions, examTopicConfigs, topics } from "@/server/schema";
import { eq } from "drizzle-orm";
import { generateQuestions, validateQuestion } from "./question-generator";

export interface GenerationResult {
  examId: string;
  totalGenerated: number;
  totalFailed: number;
  questionIds: string[];
  errors: string[];
}

// Generate for a single topic
async function generateForTopic(
  examId: string,
  config: any,
  topic: any,
): Promise<{
  generated: number;
  failed: number;
  questionIds: string[];
  errors: string[];
}> {
  const result = { generated: 0, failed: 0, questionIds: [] as string[], errors: [] as string[] };

  // Find parent subject slug for prompt selection
  let subjectSlug = topic.slug;
  if (topic.parentId) {
    const parent = await db.query.topics.findFirst({
      where: eq(topics.id, topic.parentId),
    });
    if (parent) subjectSlug = parent.slug;
  }

  try {
    const generated = await generateQuestions({
      subjectSlug,
      topicName: topic.name,
      difficulty: config.difficulty,
      count: config.questionCount,
    });

    // Validate and store all questions in parallel
    const insertPromises = generated.questions.map(async (q) => {
      const validation = validateQuestion(q);
      if (!validation.valid) {
        result.failed++;
        result.errors.push(`Invalid question for ${topic.name}: ${validation.issues.join(", ")}`);
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
            generatedForExamId: examId,
            tags: [],
          })
          .returning();

        result.questionIds.push(inserted.id);
        result.generated++;
      } catch (dbError) {
        result.failed++;
        result.errors.push(
          `DB error for ${topic.name}: ${dbError instanceof Error ? dbError.message : "unknown"}`,
        );
      }
    });

    await Promise.all(insertPromises);
  } catch (genError) {
    result.failed += config.questionCount;
    result.errors.push(
      `AI generation failed for ${topic.name}: ${genError instanceof Error ? genError.message : "unknown"}`,
    );
  }

  return result;
}

export async function generateQuestionsForExam(
  examId: string,
): Promise<GenerationResult> {
  const topicConfigsList = await db.query.examTopicConfigs.findMany({
    where: eq(examTopicConfigs.examId, examId),
    with: { topic: true },
  });

  if (topicConfigsList.length === 0) {
    return {
      examId,
      totalGenerated: 0,
      totalFailed: 0,
      questionIds: [],
      errors: [
        "No topics configured for this exam. Go to the exam creation wizard and select subjects/topics first.",
      ],
    };
  }

  // Generate ALL topics in PARALLEL — much faster
  console.log(`[AI] Generating questions for ${topicConfigsList.length} topics in parallel...`);
  const startTime = Date.now();

  const topicResults = await Promise.all(
    topicConfigsList
      .filter((config) => config.topic)
      .map((config) => generateForTopic(examId, config, config.topic)),
  );

  console.log(`[AI] All topics done in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Merge results
  const result: GenerationResult = {
    examId,
    totalGenerated: 0,
    totalFailed: 0,
    questionIds: [],
    errors: [],
  };

  for (const tr of topicResults) {
    result.totalGenerated += tr.generated;
    result.totalFailed += tr.failed;
    result.questionIds.push(...tr.questionIds);
    result.errors.push(...tr.errors);
  }

  return result;
}
