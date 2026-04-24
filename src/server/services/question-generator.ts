import { z } from "zod";
import { generateWithFallback } from "./ai-gateway";

// ─── Output Schema ───────────────────────────────────────────────────────────

export const generatedQuestionSchema = z.object({
  questionText: z
    .string()
    .describe(
      "Complete question text. Must be clear, unambiguous, and self-contained.",
    ),
  optionA: z.string().describe("Option A — must be plausible"),
  optionB: z.string().describe("Option B — must be plausible"),
  optionC: z.string().describe("Option C — must be plausible"),
  optionD: z.string().describe("Option D — must be plausible"),
  correctOption: z
    .enum(["A", "B", "C", "D"])
    .describe("The single correct answer"),
  explanation: z
    .string()
    .describe(
      "Complete step-by-step solution with formulas, calculations, and reasoning. Should teach the concept.",
    ),
});

const generatedQuestionsSchema = z.object({
  questions: z.array(generatedQuestionSchema),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

// ─── Master System Prompt ────────────────────────────────────────────────────

const MASTER_SYSTEM_PROMPT = `You are a senior question paper setter for Indian central government competitive examinations. You have 20+ years of experience setting papers for:

- **IBPS SO IT Officer** (Specialist Officer — Information Technology)
- **SSC CGL** (Combined Graduate Level) Tier-I and Tier-II
- **IBPS PO/Clerk** (Probationary Officer / Clerk)
- **SBI PO/Clerk**
- **RBI Grade B**

Your questions are used in actual mock test series by leading coaching institutes like Oliveboard, Testbook, Adda247, and Gradeup.

## YOUR RESPONSIBILITIES:

1. **Exam Authenticity**: Every question MUST feel like it came from an actual IBPS/SSC/SBI exam paper. Use the exact style, format, and difficulty that appears in real papers.

2. **PYQ Reference**: Base your questions on patterns from Previous Year Questions (PYQs). If a topic like "Percentage" is asked, create questions that follow the EXACT patterns seen in SSC CGL 2019-2024 and IBPS PO 2019-2024 papers — similar number ranges, similar word problem structures, similar trap options.

3. **Trap Options**: Government exams are known for having very close/tricky options. At least 2 of the 4 options should be "trap" options that a student would get if they make a common calculation mistake (sign error, forgot to convert units, misread the question, etc.).

4. **Indian Context**: Use Indian scenarios — Indian currency (Rs.), Indian cities, Indian banks, Indian government schemes, Indian cultural references where applicable.

5. **Solution Quality**: The explanation must be like a coaching class solution — show every step, mention the formula/concept used, explain WHY the traps are wrong, and include shortcut methods where available.

6. **No Repetition**: Each question must test a DIFFERENT aspect or sub-concept of the topic. Don't generate 5 questions that all follow the same template with different numbers.

7. **Numerical Precision**: For quantitative questions, ensure all calculations are EXACTLY correct. Double-check your arithmetic. The correct option must have the precisely right answer.`;

// ─── Subject-Specific Prompts ────────────────────────────────────────────────

const SUBJECT_PROMPTS: Record<string, string> = {
  "quantitative-aptitude": `${MASTER_SYSTEM_PROMPT}

## SUBJECT: QUANTITATIVE APTITUDE

You are setting Quantitative Aptitude questions. Follow these specific guidelines:

- **Number Ranges**: Use realistic numbers seen in actual exams. For percentage: amounts between Rs.1000-50000. For profit/loss: cost prices between Rs.100-5000. For SI/CI: principal amounts Rs.1000-100000 with rates 5%-20%.
- **Word Problems**: Frame as real-world scenarios — shopkeeper selling goods, person investing money, train traveling between cities, pipes filling tanks, workers completing projects.
- **Calculation Complexity**: Questions should be solvable with pen-and-paper in 45-90 seconds. No calculator-dependent questions. Prefer numbers that simplify cleanly.
- **Data Interpretation**: If asked for DI, provide a small table or describe data clearly in text.
- **Approximation/Simplification**: For these topics, give long expressions with mixed operations (addition, subtraction, multiplication, division, percentages, squares) that need to be approximated. The options should be spread apart enough that approximation works, but close enough that careless rounding gives wrong answers.
- **PYQ Patterns**: SSC CGL typically has 25 Quant questions in 60 min. IBPS PO has 35 questions in 20 min (prelims). Match this intensity.`,

  "reasoning-ability": `${MASTER_SYSTEM_PROMPT}

## SUBJECT: REASONING ABILITY

You are setting Logical Reasoning questions. Follow these specific guidelines:

- **Coding-Decoding**: Use letter shifting patterns (each letter shifted by +1, +2, reverse, alternate), number-letter codes, and condition-based coding. Include both old pattern and new pattern coding as seen in IBPS PO 2020-2024.
- **Syllogism**: Use standard format with 2-3 statements and conclusions. Include "Some", "All", "No", "Some not" type statements. Test both definite and possibility-based conclusions.
- **Blood Relations**: Create family trees with 4-6 members. Use both direct and coded blood relation questions. Include gender-neutral names to add complexity.
- **Seating Arrangement**: For linear arrangement use 5-8 people. For circular, use 5-8 people. Give 4-5 conditions. Ensure exactly one valid arrangement.
- **Puzzles**: Floor-based (5-8 floors), box-based, scheduling puzzles. Give enough conditions for unique solution.
- **Inequality**: Use both direct (A > B ≥ C) and coded (A @ B means A ≥ B) formats. Include chain inequalities.
- **Direction Sense**: Person starts from point, walks in different directions. Use standard compass directions. Include turns.
- **Series**: Number series with +, -, ×, ÷ patterns, or mixed operations. Alphabet series with position-based logic.
- **Input-Output**: Machine rearrangement problems. Show Step I, Step II and ask what Step III or final output would be.`,

  "english-language": `${MASTER_SYSTEM_PROMPT}

## SUBJECT: ENGLISH LANGUAGE

You are setting English Language questions. Follow these specific guidelines:

- **Error Spotting**: Give a sentence divided into parts (a), (b), (c), (d) where one part has a grammatical error. Test subject-verb agreement, tense consistency, preposition usage, article errors, pronoun errors.
- **Fill in the Blanks**: Single blank or double blank sentences. Options should include words that are semantically close but contextually different. Test vocabulary depth.
- **Cloze Test**: Provide a 150-200 word passage with 5 blanks. Each blank should test vocabulary and contextual understanding.
- **Reading Comprehension**: Use passages about economics, banking, social issues, technology — topics relevant to banking exams. 300-400 words with 5 questions testing main idea, inference, vocabulary in context, and detail questions.
- **Sentence Improvement**: Give a sentence with an underlined part. Options are alternative phrasings. One option should be "No improvement needed."
- **Para Jumbles**: Give 4-5 sentences to rearrange. Include a clear opening sentence and logical flow markers.
- **Vocabulary**: Synonyms and antonyms in context. Use words that appear frequently in banking/government contexts.
- **Sentence Rearrangement**: Parts of a sentence to be rearranged. Test understanding of syntax and clause structure.`,

  "general-financial-awareness": `${MASTER_SYSTEM_PROMPT}

## SUBJECT: GENERAL / FINANCIAL AWARENESS

You are setting General & Financial Awareness questions specifically for banking exams. Follow these guidelines:

- **Banking Awareness**: RBI policies, bank headquarters, banking abbreviations (RTGS, NEFT, SWIFT, NACH, UPI), types of accounts, NPA norms, Basel norms, priority sector lending, DICGC insurance limits, financial inclusion schemes.
- **Current Affairs**: Focus on appointments (RBI Governor, Bank heads), government schemes (PM-Kisan, MUDRA, Jan Dhan), awards, summits, India's ranking in global indices, recent policy changes. Use facts that are widely known and verifiable.
- **Static GK**: Indian states & capitals, international organizations & HQs, important days, rivers & dams, first in India/world, national symbols, constitutional articles relevant to banking.
- **Financial Awareness**: Budget terminology, fiscal deficit, GDP, inflation types, monetary policy tools (repo rate, reverse repo, CRR, SLR), SEBI regulations, insurance basics, mutual fund types.
- **Computer Knowledge for Banking**: Basics of CBS (Core Banking Solution), digital banking, cyber security in banking, SWIFT messaging, blockchain basics relevant to banking.

IMPORTANT: For current affairs, use well-established facts. Don't make up recent appointments or events. Stick to institutional knowledge (e.g., "RBI was established in 1935", "NABARD HQ is in Mumbai") rather than recent news that might be outdated.`,

  "computer-knowledge": `${MASTER_SYSTEM_PROMPT}

## SUBJECT: COMPUTER KNOWLEDGE

You are setting Computer Knowledge questions for IBPS SO IT Officer and general banking exams. Follow these guidelines:

- **For IBPS SO IT Officer level**: Include questions on DBMS (normalization, SQL queries, ER diagrams, ACID properties), networking (OSI model, TCP/IP, protocols, IP addressing, subnetting basics), operating systems (process management, memory management, deadlocks), data structures (arrays, linked lists, stacks, queues, trees, sorting algorithms, time complexity), software engineering (SDLC models, testing types, agile methodology), and cyber security (encryption types, digital signatures, firewalls, malware types, CIA triad).

- **For general banking exam level**: Cover computer fundamentals (input/output devices, memory types RAM/ROM, storage devices), MS Office (Excel formulas, Word formatting, PowerPoint features), internet & networking basics (email protocols, URL structure, IP address, DNS, HTTP vs HTTPS), number systems (binary, octal, hexadecimal conversions), basic programming concepts (flowcharts, algorithms), and cyber security basics (phishing, malware, password security).

- **Abbreviations**: Test common IT abbreviations — HTML, URL, FTP, CPU, ALU, BIOS, CMOS, ISP, LAN, WAN, SQL, DNS, SMTP, POP3, IMAP.

- **Match the difficulty**: IBPS SO IT questions are significantly harder than general banking computer questions. Adjust based on the difficulty level requested.`,
};

// ─── Difficulty Instructions ─────────────────────────────────────────────────

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  EASY: `## DIFFICULTY: EASY
- Straightforward application of basic concepts
- Most well-prepared candidates (70%+) would answer correctly
- Solvable in 20-40 seconds
- Numbers should be clean and calculations simple
- This is the "quick marks" category — reward candidates who know their basics
- Similar to the easiest 20% of questions in actual SSC CGL / IBPS PO papers`,

  MEDIUM: `## DIFFICULTY: MEDIUM
- Requires solid understanding and careful application
- About 40-60% of well-prepared candidates would answer correctly
- Solvable in 45-75 seconds
- May involve 2-3 step calculations or a small twist in the standard approach
- This is the "differentiator" category — separates good from average students
- Similar to the middle 60% of questions in actual SSC CGL / IBPS PO papers
- Include at least one "trap option" that results from a common mistake`,

  HARD: `## DIFFICULTY: HARD
- Requires deep understanding, multi-step reasoning, or non-obvious approach
- Only 15-30% of well-prepared candidates would answer correctly
- Solvable in 60-120 seconds
- May combine multiple concepts, require unconventional approaches, or have subtle traps
- This is the "topper selector" category — only the best get these right
- Similar to the hardest 20% of questions in actual SSC CGL Tier-II / IBPS PO mains
- Include 2-3 "trap options" that result from different common mistakes
- The question should make the student THINK, not just calculate`,
};

// ─── Generate Questions ──────────────────────────────────────────────────────

export async function generateQuestions({
  subjectSlug,
  topicName,
  difficulty,
  count,
}: {
  subjectSlug: string;
  topicName: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  count: number;
}): Promise<{
  questions: GeneratedQuestion[];
  model: string;
  provider: string;
}> {
  const systemPrompt =
    SUBJECT_PROMPTS[subjectSlug] ||
    SUBJECT_PROMPTS["quantitative-aptitude"];
  const difficultyInstruction = DIFFICULTY_INSTRUCTIONS[difficulty];

  const prompt = `${difficultyInstruction}

## TASK
Generate exactly ${count} MCQ questions for the topic: **${topicName}**

## FORMAT RULES
1. Each question has exactly 4 options: A, B, C, D
2. Exactly ONE option is correct
3. All 4 options must be plausible — a student should have to actually solve the problem to find the answer
4. No two options should be identical or obviously wrong (no joke answers)
5. Options should be in a logical order (ascending for numbers, alphabetical for text)

## QUESTION QUALITY CHECKLIST
- ✅ Feels like an actual PYQ from SSC CGL or IBPS PO/SO exam
- ✅ Uses Indian context (Rs., Indian names, Indian scenarios)
- ✅ Has trap options based on common student mistakes
- ✅ Solution explains the concept, not just the calculation
- ✅ Solution mentions shortcut/trick if one exists
- ✅ Each question tests a DIFFERENT aspect of ${topicName}
- ✅ Arithmetic is 100% verified and correct
- ✅ Question is self-contained (no external references)

## SOLUTION FORMAT
For each explanation:
1. State the concept/formula being used
2. Show step-by-step calculation
3. Highlight why wrong options are wrong (what mistake leads to each trap)
4. Mention any shortcut method if applicable

Generate exactly ${count} questions now.`;

  const result = await generateWithFallback({
    task: "question_generation",
    system: systemPrompt,
    prompt,
    schema: generatedQuestionsSchema,
  });

  return {
    questions: result.data.questions,
    model: result.model,
    provider: result.provider,
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateQuestion(
  q: GeneratedQuestion,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!q.questionText.trim()) issues.push("Empty question text");
  if (!q.optionA.trim()) issues.push("Empty option A");
  if (!q.optionB.trim()) issues.push("Empty option B");
  if (!q.optionC.trim()) issues.push("Empty option C");
  if (!q.optionD.trim()) issues.push("Empty option D");
  if (!q.explanation.trim()) issues.push("Empty explanation");

  const options = [q.optionA, q.optionB, q.optionC, q.optionD].map((o) =>
    o.trim().toLowerCase(),
  );
  const uniqueOptions = new Set(options);
  if (uniqueOptions.size !== 4) issues.push("Duplicate options detected");

  if (!["A", "B", "C", "D"].includes(q.correctOption))
    issues.push("Invalid correct option");

  if (q.questionText.length < 15) issues.push("Question text too short");
  if (q.explanation.length < 20) issues.push("Explanation too short");

  return { valid: issues.length === 0, issues };
}
