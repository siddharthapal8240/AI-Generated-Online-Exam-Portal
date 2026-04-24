import { z } from "zod";

export const createExamSchema = z.object({
  // Step 1: Basic Info
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(5000).optional(),
  scheduledStartTime: z.string().optional().transform((v) => (v === "" ? undefined : v)),
  scheduledEndTime: z.string().optional().transform((v) => (v === "" ? undefined : v)),
  durationMinutes: z.coerce.number().int().min(5, "Minimum 5 minutes").max(480, "Maximum 8 hours"),

  // Step 2: Content
  totalQuestions: z.coerce.number().int().min(1).max(200),
  targetDifficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  questionMode: z.enum(["PRE_GENERATED", "DYNAMIC", "POOL_BASED"]).default("PRE_GENERATED"),
  poolMultiplier: z.coerce.number().int().min(2).max(5).default(3),
  useAiGeneration: z.boolean().default(true),
  usePyqBank: z.boolean().default(true),
  shuffleQuestions: z.boolean().default(true),

  // Step 3: Scoring
  marksPerQuestion: z.coerce.number().min(0.25).max(100).default(1),
  negativeMarking: z.coerce.number().min(0).max(100).default(0),
  passingPercentage: z.union([z.coerce.number().min(0).max(100), z.literal(""), z.nan()]).optional().transform((v) => (v === "" || (typeof v === "number" && isNaN(v)) ? undefined : v as number)),
  showResultInstantly: z.boolean().default(false),

  // Step 4: Settings
  allowTabSwitch: z.boolean().default(false),
  maxTabSwitches: z.coerce.number().int().min(0).max(20).default(3),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type CreateExamFormInput = z.input<typeof createExamSchema>;

export const updateExamSchema = createExamSchema.partial();
export type UpdateExamInput = z.infer<typeof updateExamSchema>;

// Topic config for an exam
export const examTopicConfigSchema = z.object({
  topicId: z.string().min(1),
  questionCount: z.coerce.number().int().min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  pyqPercentage: z.coerce.number().int().min(0).max(100).default(50),
});
export type ExamTopicConfigInput = z.infer<typeof examTopicConfigSchema>;

// Schedule exam
export const scheduleExamSchema = z.object({
  scheduledStartTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime(),
  bufferMinutes: z.coerce.number().int().min(0).max(60).default(0),
});
export type ScheduleExamInput = z.infer<typeof scheduleExamSchema>;

// Invite participants
export const inviteParticipantsSchema = z.object({
  emails: z.array(z.string().email()).min(1, "At least one email required"),
});
export type InviteParticipantsInput = z.infer<typeof inviteParticipantsSchema>;

// Exam status filter
export const examFilterSchema = z.object({
  status: z.enum(["ALL", "DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "ARCHIVED"]).default("ALL"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ExamFilterInput = z.infer<typeof examFilterSchema>;
