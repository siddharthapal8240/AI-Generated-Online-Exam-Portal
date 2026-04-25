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

      const { generateQuestions, validateQuestion } = await import(
        "../server/services/question-generator"
      );

      // Resolve parent slugs first (fast DB lookups)
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

      // Generate ALL topics in PARALLEL — no timeout limit in Trigger.dev
      let completedCount = 0;

      const results = await Promise.all(
        configsWithSlugs.map(async ({ config, subjectSlug }) => {
          const topic = config.topic!;
          let generated = 0;
          let failed = 0;
          const errors: string[] = [];

          try {
            const result = await generateQuestions({
              subjectSlug,
              topicName: topic.name,
              difficulty: config.difficulty,
              count: config.questionCount,
            });

            for (const q of result.questions) {
              const validation = validateQuestion(q);
              if (!validation.valid) {
                failed++;
                errors.push(`Invalid: ${validation.issues.join(", ")}`);
                continue;
              }

              await db.insert(schema.questions).values({
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
                aiModel: result.model,
                generatedForExamId: examTag,
                tags: [],
              });
              generated++;
            }
          } catch (err) {
            failed += config.questionCount;
            errors.push(
              `${topic.name}: ${err instanceof Error ? err.message : "unknown"}`,
            );
          }

          // Update progress after each topic completes
          completedCount++;
          await db
            .update(schema.generationJobs)
            .set({
              completedTopics: completedCount,
              currentTopic: topic.name,
              totalGenerated: schema.generationJobs.totalGenerated,
            })
            .where(eq(schema.generationJobs.id, jobId));

          return { topic: topic.name, generated, failed, errors };
        }),
      );

      // Aggregate results
      const totalGenerated = results.reduce((s, r) => s + r.generated, 0);
      const totalFailed = results.reduce((s, r) => s + r.failed, 0);
      const allErrors = results.flatMap((r) => r.errors);

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
