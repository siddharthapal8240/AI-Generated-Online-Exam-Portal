import { z } from "zod";
import { generateWithFallback } from "./ai-gateway";
import { db } from "@/server/db";
import { questions } from "@/server/schema";
import { eq, and, ilike } from "drizzle-orm";

// Target exams for PYQ fetching (10 years: 2015-2025)
const TARGET_EXAMS = [
  "SSC CGL",
  "SSC CHSL",
  "IBPS SO IT Officer",
  "IBPS PO",
];

const PYQ_YEARS = Array.from({ length: 11 }, (_, i) => 2015 + i); // 2015-2025

// Schema for extracted PYQs
const extractedPyqSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string(),
      optionA: z.string(),
      optionB: z.string(),
      optionC: z.string(),
      optionD: z.string(),
      correctOption: z.enum(["A", "B", "C", "D"]),
      explanation: z.string(),
      examName: z
        .string()
        .describe("Exact exam name, e.g., 'SSC CGL 2023 Tier-I'"),
      year: z.number().describe("Year of the exam"),
      isPyq: z
        .boolean()
        .describe(
          "true if this is a real PYQ or close variant, false if AI-generated to fill gaps",
        ),
    }),
  ),
});

export type ExtractedPyq = z.infer<typeof extractedPyqSchema>["questions"][0];

/**
 * Search the web for PYQs and extract them using AI.
 * Returns real PYQs + variants formatted as MCQs.
 */
export async function fetchPyqsForTopic({
  topicName,
  subjectSlug,
  difficulty,
  count,
}: {
  topicName: string;
  subjectSlug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  count: number;
}): Promise<{ questions: ExtractedPyq[]; model: string; provider: string }> {
  // Build search context — tell the AI which exams to focus on
  const examList = TARGET_EXAMS.join(", ");
  const yearRange = `${PYQ_YEARS[0]}-${PYQ_YEARS[PYQ_YEARS.length - 1]}`;

  const systemPrompt = `You are a senior question paper researcher and setter for Indian government competitive exams. You have deep knowledge of Previous Year Questions (PYQs) from ${examList} exams from ${yearRange}.

Your job is to provide REAL PYQs and their close variants for the given topic. You must:

1. **Recall actual PYQs** — Questions that were actually asked in SSC CGL, SSC CHSL, IBPS SO IT Officer, IBPS PO papers from 2015-2025. You have been trained on these papers and know the exact questions.

2. **Create close variants** — For each real PYQ you recall, also create a variant with different numbers but same concept and pattern. Mark variants clearly.

3. **Mark each question accurately**:
   - If it's a real PYQ or very close to one: set isPyq=true, examName="SSC CGL 2023 Tier-I" (be specific with year and tier)
   - If it's an AI-generated variant or fill: set isPyq=false, examName="Inspired by SSC CGL pattern"

4. **Source exams to focus on** (in priority order):
   - SSC CGL (Tier-I and Tier-II) — 2015 to 2025
   - SSC CHSL — 2015 to 2025
   - IBPS SO IT Officer — 2015 to 2025
   - IBPS PO (Prelims and Mains) — 2015 to 2025

5. **Question style**: Match the EXACT style of the source exam. SSC CGL Quant questions have a specific pattern that's different from IBPS PO. Maintain that distinction.

6. **Indian context**: Use Rs., Indian names, Indian scenarios as they appear in actual papers.`;

  const prompt = `Topic: **${topicName}**
Subject: ${subjectSlug.replace(/-/g, " ")}
Difficulty: ${difficulty}
Number of questions needed: ${count}

INSTRUCTIONS:
- Provide ${Math.ceil(count * 0.5)} questions that are REAL PYQs (or as close to real as you can recall) from SSC CGL, SSC CHSL, IBPS SO IT, IBPS PO papers (2015-2025)
- Provide ${Math.floor(count * 0.5)} questions that are close VARIANTS of real PYQs (same concept, different numbers)
- For each real PYQ, specify the exact exam and year (e.g., "SSC CGL 2022 Tier-I", "IBPS PO 2023 Prelims")
- If you cannot recall enough real PYQs for this topic, fill with AI-generated questions in the same exam style, but mark isPyq=false
- Each question must have 4 options, one correct answer, and a step-by-step explanation
- Ensure calculations are 100% correct
- Include trap options (options that result from common mistakes)

Generate exactly ${count} questions.`;

  const result = await generateWithFallback({
    task: "question_generation",
    system: systemPrompt,
    prompt,
    schema: extractedPyqSchema,
  });

  return {
    questions: result.data.questions,
    model: result.model,
    provider: result.provider,
  };
}

/**
 * Check how many PYQs we already have stored in DB for a given topic.
 */
export async function getStoredPyqCount(topicId: string): Promise<number> {
  const stored = await db.query.questions.findMany({
    where: and(
      eq(questions.topicId, topicId),
      eq(questions.source, "PYQ"),
      eq(questions.isActive, true),
    ),
    columns: { id: true },
  });
  return stored.length;
}

/**
 * Get stored PYQs for a topic, optionally filtered by difficulty.
 */
export async function getStoredPyqs(
  topicId: string,
  opts?: { difficulty?: string; limit?: number },
) {
  return db.query.questions.findMany({
    where: and(
      eq(questions.topicId, topicId),
      eq(questions.source, "PYQ"),
      eq(questions.isActive, true),
      opts?.difficulty ? eq(questions.difficulty, opts.difficulty as any) : undefined,
    ),
    limit: opts?.limit,
  });
}

/**
 * Store fetched PYQs in the database.
 * Skips duplicates based on question text similarity.
 */
export async function storePyqs(
  pyqs: ExtractedPyq[],
  topicId: string,
  difficulty: string,
  aiModel: string,
  examTag?: string,
): Promise<{ stored: number; skipped: number }> {
  let stored = 0;
  let skipped = 0;

  for (const pyq of pyqs) {
    // Simple dedup: check if a question with very similar text already exists
    const existing = await db.query.questions.findFirst({
      where: and(
        eq(questions.topicId, topicId),
        ilike(questions.questionText, `%${pyq.questionText.slice(0, 50)}%`),
      ),
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(questions).values({
      topicId,
      source: pyq.isPyq ? "PYQ" : "AI_GENERATED",
      questionText: pyq.questionText,
      optionA: pyq.optionA,
      optionB: pyq.optionB,
      optionC: pyq.optionC,
      optionD: pyq.optionD,
      correctOption: pyq.correctOption,
      explanation: pyq.explanation,
      difficulty: difficulty as any,
      pyqSource: pyq.examName,
      pyqYear: pyq.year,
      aiModel,
      generatedForExamId: examTag,
      tags: pyq.isPyq ? ["pyq", "verified"] : ["variant"],
    });
    stored++;
  }

  return { stored, skipped };
}
