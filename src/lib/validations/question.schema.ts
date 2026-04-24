import { z } from "zod";

export const createQuestionSchema = z.object({
  topicId: z.string().min(1, "Topic is required"),
  source: z.enum(["AI_GENERATED", "PYQ", "MANUAL"]).default("MANUAL"),
  questionText: z.string().min(5, "Question text is too short").max(5000),
  optionA: z.string().min(1, "Option A is required").max(1000),
  optionB: z.string().min(1, "Option B is required").max(1000),
  optionC: z.string().min(1, "Option C is required").max(1000),
  optionD: z.string().min(1, "Option D is required").max(1000),
  correctOption: z.enum(["A", "B", "C", "D"], { required_error: "Correct option is required" }),
  explanation: z.string().min(1, "Explanation is required").max(5000),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  pyqSource: z.string().max(200).optional(),
  pyqYear: z.coerce.number().int().min(2000).max(2030).optional(),
  tags: z.array(z.string()).default([]),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = createQuestionSchema.partial();
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

export const questionFilterSchema = z.object({
  topicId: z.string().optional(),
  source: z.enum(["ALL", "AI_GENERATED", "PYQ", "MANUAL"]).default("ALL"),
  difficulty: z.enum(["ALL", "EASY", "MEDIUM", "HARD"]).default("ALL"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type QuestionFilterInput = z.infer<typeof questionFilterSchema>;
