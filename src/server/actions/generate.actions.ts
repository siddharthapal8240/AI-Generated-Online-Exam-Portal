"use server";

import { revalidatePath } from "next/cache";
import { getExamById } from "@/server/data-access/exams";
import { generateQuestionsForExam } from "@/server/services/exam-question-manager";

export type GenerateActionResult = {
  success: boolean;
  error?: string;
  data?: {
    totalGenerated: number;
    totalFailed: number;
    pyqDirectCount: number;
    pyqVariantCount: number;
    aiCount: number;
    errors: string[];
  };
};

export async function generateQuestionsAction(
  examId: string,
): Promise<GenerateActionResult> {
  try {
    // Check exam's question mode for pool multiplier
    const exam = await getExamById(examId);
    const questionMode = (exam as any)?.questionMode || "PRE_GENERATED";
    const poolMultiplier = (exam as any)?.poolMultiplier || 3;

    const multiplier = questionMode === "POOL_BASED" ? poolMultiplier : 1;

    const result = await generateQuestionsForExam(examId, { multiplier });

    revalidatePath(`/admin/exams/${examId}`, "page");
    revalidatePath(`/admin/exams/${examId}`, "layout");
    revalidatePath("/admin/questions", "page");
    revalidatePath("/admin/exams", "page");

    return {
      success: true,
      data: {
        totalGenerated: result.totalGenerated,
        totalFailed: result.totalFailed,
        pyqDirectCount: result.pyqDirectCount,
        pyqVariantCount: result.pyqVariantCount,
        aiCount: result.aiCount,
        errors: result.errors,
      },
    };
  } catch (error) {
    console.error("Question generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}
