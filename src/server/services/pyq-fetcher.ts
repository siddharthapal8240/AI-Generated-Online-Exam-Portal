import { z } from "zod";
import { generateWithFallback } from "./ai-gateway";
import { db } from "@/server/db";
import { questions } from "@/server/schema";
import { eq, and, ilike, or } from "drizzle-orm";

// ─── Target Exams ────────────────────────────────────────────────────────────

const TARGET_EXAMS = [
  "SSC CGL Tier-I",
  "SSC CGL Tier-II",
  "SSC CHSL",
  "IBPS SO IT Officer",
  "IBPS PO Prelims",
  "IBPS PO Mains",
];

// ─── Schemas ─────────────────────────────────────────────────────────────────

const pyqSearchSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string(),
      optionA: z.string(),
      optionB: z.string(),
      optionC: z.string(),
      optionD: z.string(),
      correctOption: z.enum(["A", "B", "C", "D"]),
      explanation: z.string(),
      sourceExam: z
        .string()
        .describe("Exact exam name e.g. 'SSC CGL 2023 Tier-I'"),
      year: z.number(),
      questionType: z
        .enum(["DIRECT_PYQ", "PYQ_VARIANT", "AI_EXAM_LEVEL"])
        .describe(
          "DIRECT_PYQ = real question from actual paper, PYQ_VARIANT = tweaked version of a real PYQ with different numbers, AI_EXAM_LEVEL = fresh AI question at same exam level",
        ),
    }),
  ),
});

export type FetchedQuestion = z.infer<
  typeof pyqSearchSchema
>["questions"][0];

// ─── PYQ Fetching ────────────────────────────────────────────────────────────

/**
 * Fetch PYQs for a topic. Called on EVERY generation — always searches fresh.
 *
 * Returns a structured mix:
 *   - DIRECT_PYQ: Real questions from actual exam papers
 *   - PYQ_VARIANT: Tweaked versions with different numbers/names
 *   - AI_EXAM_LEVEL: Fresh AI questions at the same difficulty level
 */
export async function fetchAndGenerateQuestions({
  topicName,
  subjectSlug,
  difficulty,
  totalCount,
  pyqDirectPercent = 20,
  pyqVariantPercent = 20,
}: {
  topicName: string;
  subjectSlug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  totalCount: number;
  pyqDirectPercent?: number;
  pyqVariantPercent?: number;
}): Promise<{
  questions: FetchedQuestion[];
  model: string;
  provider: string;
}> {
  const directPyqCount = Math.max(1, Math.round((totalCount * pyqDirectPercent) / 100));
  const variantCount = Math.max(1, Math.round((totalCount * pyqVariantPercent) / 100));
  const aiCount = totalCount - directPyqCount - variantCount;

  const examList = TARGET_EXAMS.join(", ");

  const systemPrompt = `You are a question paper researcher with access to a comprehensive database of Previous Year Questions (PYQs) from Indian government competitive exams. You have detailed knowledge of every question asked in ${examList} papers from 2015 to 2025.

YOUR CRITICAL RESPONSIBILITIES:

1. **DIRECT PYQs (${directPyqCount} questions)**:
   - These MUST be actual questions from real exam papers
   - You must cite the exact exam and year: "SSC CGL 2022 Tier-I", "IBPS PO 2023 Prelims"
   - The question text, options, and answer must match what was actually asked
   - Search through papers from: ${examList}
   - Years to search: 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
   - If you recall a question but aren't 100% sure of the exact year, mark it as the closest year you believe
   - Set questionType = "DIRECT_PYQ"

2. **PYQ VARIANTS (${variantCount} questions)**:
   - Take a real PYQ and modify it: change the numbers, names, or context
   - Keep the same concept, formula, and difficulty level
   - Example: If PYQ asks "A person walks 10km at 5km/h...", variant could be "A cyclist rides 20km at 10km/h..."
   - Cite which PYQ it's based on: "Variant of SSC CGL 2021 Tier-I"
   - Set questionType = "PYQ_VARIANT"

3. **AI EXAM-LEVEL (${aiCount} questions)**:
   - Fresh questions that match the exact style and difficulty of ${examList}
   - Must feel indistinguishable from a real PYQ
   - Use the same question patterns, number ranges, and formats seen in real papers
   - Set questionType = "AI_EXAM_LEVEL"
   - Set sourceExam to the exam it most closely matches, e.g., "SSC CGL style"

QUALITY RULES:
- Every question MUST have exactly 4 plausible options
- Include trap options (common calculation mistakes)
- Solutions must be step-by-step with formulas
- All arithmetic MUST be verified and correct
- Use Indian context: Rs., Indian names, Indian scenarios
- Questions must be self-contained
- NO duplicate concepts across the ${totalCount} questions`;

  const prompt = `Topic: **${topicName}**
Subject: ${subjectSlug.replace(/-/g, " ")}
Difficulty: ${difficulty}

SEARCH AND GENERATE:
1. Search through all ${examList} papers from 2015-2025 for "${topicName}" questions
2. Pick the ${directPyqCount} best REAL PYQs you can find for this topic (questionType: "DIRECT_PYQ")
3. Create ${variantCount} VARIANTS of real PYQs — same concept, different numbers (questionType: "PYQ_VARIANT")
4. Generate ${aiCount} fresh AI questions at the same exam level (questionType: "AI_EXAM_LEVEL")

Total: exactly ${totalCount} questions

For DIRECT_PYQs, search these specific sources:
- SSC CGL papers: 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024
- SSC CHSL papers: 2015-2024
- IBPS PO papers: 2015-2024
- IBPS SO IT Officer papers: 2017-2024

Generate exactly ${totalCount} questions now.`;

  const result = await generateWithFallback({
    task: "question_generation",
    system: systemPrompt,
    prompt,
    schema: pyqSearchSchema,
  });

  return {
    questions: result.data.questions,
    model: result.model,
    provider: result.provider,
  };
}

// ─── Deduplication ───────────────────────────────────────────────────────────

/**
 * Check if a question already exists in the DB.
 * Uses first 60 chars of question text for fuzzy matching.
 */
export async function isDuplicate(
  questionText: string,
  topicId: string,
): Promise<boolean> {
  // Normalize: take first 60 chars, remove extra spaces
  const searchText = questionText.trim().slice(0, 60).replace(/\s+/g, " ");

  const existing = await db.query.questions.findFirst({
    where: and(
      eq(questions.topicId, topicId),
      ilike(questions.questionText, `%${searchText}%`),
    ),
    columns: { id: true },
  });

  return !!existing;
}

// ─── Store PYQs ──────────────────────────────────────────────────────────────

/**
 * Store fetched PYQs in the permanent question bank.
 * These are stored WITHOUT an examTag so they're reusable across exams.
 * Returns IDs of stored questions.
 */
export async function storePyqsInBank(
  fetchedQuestions: FetchedQuestion[],
  topicId: string,
  difficulty: string,
  aiModel: string,
): Promise<{ stored: string[]; skipped: number }> {
  const storedIds: string[] = [];
  let skipped = 0;

  for (const q of fetchedQuestions) {
    // Skip if already in DB
    const duplicate = await isDuplicate(q.questionText, topicId);
    if (duplicate) {
      skipped++;
      continue;
    }

    const source =
      q.questionType === "DIRECT_PYQ"
        ? "PYQ"
        : q.questionType === "PYQ_VARIANT"
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
          topicId,
          source: source as any,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          explanation: q.explanation,
          difficulty: difficulty as any,
          pyqSource: q.sourceExam,
          pyqYear: q.year,
          aiModel,
          tags,
          // No generatedForExamId — stored in permanent bank
        })
        .returning();

      storedIds.push(inserted.id);
    } catch (err) {
      // Skip on DB error (likely duplicate constraint)
      skipped++;
    }
  }

  return { stored: storedIds, skipped };
}

/**
 * Get PYQs from the permanent bank for a topic.
 */
export async function getPyqsFromBank(
  topicId: string,
  opts?: { difficulty?: string; limit?: number; excludeIds?: string[] },
) {
  const results = await db.query.questions.findMany({
    where: and(
      eq(questions.topicId, topicId),
      eq(questions.source, "PYQ"),
      eq(questions.isActive, true),
      opts?.difficulty
        ? eq(questions.difficulty, opts.difficulty as any)
        : undefined,
    ),
    limit: opts?.limit || 100,
  });

  // Exclude already-used question IDs
  if (opts?.excludeIds?.length) {
    return results.filter((q) => !opts.excludeIds!.includes(q.id));
  }
  return results;
}
