import { task } from "@trigger.dev/sdk/v3";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../server/schema";

// Inline DB connection for Trigger.dev worker (runs in separate env)
function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export const generateQuestionsTask = task({
  id: "generate-questions",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: {
    jobId: string;
    examId: string;
    examTag: string;
  }) => {
    const db = getDb();
    const { jobId, examId, examTag } = payload;

    // Mark job as in progress
    await db
      .update(schema.generationJobs)
      .set({ status: "IN_PROGRESS", startedAt: new Date() })
      .where(eq(schema.generationJobs.id, jobId));

    try {
      // Get topic configs
      const topicConfigs = await db.query.examTopicConfigs.findMany({
        where: eq(schema.examTopicConfigs.examId, examId),
        with: { topic: true },
      });

      await db
        .update(schema.generationJobs)
        .set({ totalTopics: topicConfigs.length })
        .where(eq(schema.generationJobs.id, jobId));

      let totalGenerated = 0;
      let totalFailed = 0;
      const errors: string[] = [];

      // Generate for each topic
      for (let i = 0; i < topicConfigs.length; i++) {
        const config = topicConfigs[i];
        const topic = config.topic;
        if (!topic) continue;

        // Update current topic
        await db
          .update(schema.generationJobs)
          .set({
            currentTopic: topic.name,
            completedTopics: i,
          })
          .where(eq(schema.generationJobs.id, jobId));

        // Find parent subject slug
        let subjectSlug = topic.slug;
        if (topic.parentId) {
          const parent = await db.query.topics.findFirst({
            where: eq(schema.topics.id, topic.parentId),
          });
          if (parent) subjectSlug = parent.slug;
        }

        try {
          // Import dynamically to avoid bundling issues
          const { generateQuestions, validateQuestion } = await import(
            "../server/services/question-generator"
          );

          const generated = await generateQuestions({
            subjectSlug,
            topicName: topic.name,
            difficulty: config.difficulty,
            count: config.questionCount,
          });

          for (const q of generated.questions) {
            const validation = validateQuestion(q);
            if (!validation.valid) {
              totalFailed++;
              errors.push(`Invalid question for ${topic.name}: ${validation.issues.join(", ")}`);
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
              aiModel: generated.model,
              generatedForExamId: examTag,
              tags: [],
            });
            totalGenerated++;
          }
        } catch (err) {
          totalFailed += config.questionCount;
          errors.push(
            `Failed for ${topic.name}: ${err instanceof Error ? err.message : "unknown"}`,
          );
        }
      }

      // Mark completed
      await db
        .update(schema.generationJobs)
        .set({
          status: "COMPLETED",
          completedTopics: topicConfigs.length,
          totalGenerated,
          totalFailed,
          currentTopic: null,
          errors,
          completedAt: new Date(),
        })
        .where(eq(schema.generationJobs.id, jobId));

      return { totalGenerated, totalFailed, errors };
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
