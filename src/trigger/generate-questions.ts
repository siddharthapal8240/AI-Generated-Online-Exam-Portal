import { task } from "@trigger.dev/sdk/v3";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../server/schema";

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export const generateQuestionsTask = task({
  id: "generate-questions",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    jobId: string;
    examId: string;
    examTag: string;
  }) => {
    const db = getDb();
    const { jobId, examId, examTag } = payload;

    await db
      .update(schema.generationJobs)
      .set({ status: "IN_PROGRESS", startedAt: new Date() })
      .where(eq(schema.generationJobs.id, jobId));

    try {
      const topicConfigs = await db.query.examTopicConfigs.findMany({
        where: eq(schema.examTopicConfigs.examId, examId),
        with: { topic: true },
      });

      await db
        .update(schema.generationJobs)
        .set({ totalTopics: topicConfigs.length })
        .where(eq(schema.generationJobs.id, jobId));

      // Import the unified generator that handles PYQ + AI mix
      const { fetchAndGenerateQuestions } = await import(
        "../server/services/pyq-fetcher"
      );
      const { validateQuestion } = await import(
        "../server/services/question-generator"
      );

      // Resolve parent slugs
      const configsWithSlugs = await Promise.all(
        topicConfigs
          .filter((c) => c.topic)
          .map(async (config) => {
            let subjectSlug = config.topic!.slug;
            if (config.topic!.parentId) {
              const parent = await db.query.topics.findFirst({
                where: eq(schema.topics.id, config.topic!.parentId!),
              });
              if (parent) subjectSlug = parent.slug;
            }
            return { config, subjectSlug };
          }),
      );

      // Generate ALL topics in PARALLEL with PYQ + AI mix
      let completedCount = 0;
      let totalGenerated = 0;
      let totalFailed = 0;
      const allErrors: string[] = [];

      const results = await Promise.all(
        configsWithSlugs.map(async ({ config, subjectSlug }) => {
          const topic = config.topic!;
          const pyqPercentage = config.pyqPercentage ?? 40;
          const pyqDirectPercent = Math.round(pyqPercentage / 2);
          const pyqVariantPercent = pyqPercentage - pyqDirectPercent;

          try {
            // Single AI call that returns PYQs + variants + AI questions
            const fetched = await fetchAndGenerateQuestions({
              topicName: topic.name,
              subjectSlug,
              difficulty: config.difficulty,
              totalCount: config.questionCount,
              pyqDirectPercent,
              pyqVariantPercent,
            });

            let topicGenerated = 0;
            let topicFailed = 0;

            // Store all questions
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
                topicFailed++;
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

              // Store in permanent bank (no examTag)
              try {
                await db.insert(schema.questions).values({
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
                  tags,
                });
              } catch {
                // Ignore bank insert errors (duplicates)
              }

              // Store exam-specific copy
              await db.insert(schema.questions).values({
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
              });
              topicGenerated++;
            }

            totalGenerated += topicGenerated;
            totalFailed += topicFailed;
          } catch (err) {
            totalFailed += config.questionCount;
            allErrors.push(
              `${topic.name}: ${err instanceof Error ? err.message : "unknown"}`,
            );
          }

          // Update progress
          completedCount++;
          await db
            .update(schema.generationJobs)
            .set({
              completedTopics: completedCount,
              currentTopic: topic.name,
              totalGenerated,
              totalFailed,
            })
            .where(eq(schema.generationJobs.id, jobId));

          return { topic: topic.name };
        }),
      );

      // Mark completed
      await db
        .update(schema.generationJobs)
        .set({
          status: "COMPLETED",
          completedTopics: topicConfigs.length,
          totalGenerated,
          totalFailed,
          currentTopic: null,
          errors: allErrors,
          completedAt: new Date(),
        })
        .where(eq(schema.generationJobs.id, jobId));

      return { totalGenerated, totalFailed, errors: allErrors };
    } catch (err) {
      await db
        .update(schema.generationJobs)
        .set({
          status: "FAILED",
          errors: [err instanceof Error ? err.message : "Unknown error"],
          completedAt: new Date(),
        })
        .where(eq(schema.generationJobs.id, jobId));

      throw err;
    }
  },
});
