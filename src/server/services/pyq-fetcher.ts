import { z } from "zod";
import { generateWithFallback } from "./ai-gateway";
import { verifyQuestionAnswers } from "./question-generator";

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

  // Verify answers
  const verified = await verifyQuestionAnswers(
    result.data.questions.map((q) => ({
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation,
    })),
  );

  // Merge corrections back
  const correctedQuestions = result.data.questions.map((q, i) => ({
    ...q,
    correctOption: verified[i]?.correctOption || q.correctOption,
  }));

  return {
    questions: correctedQuestions,
    model: result.model,
    provider: result.provider,
  };
}
