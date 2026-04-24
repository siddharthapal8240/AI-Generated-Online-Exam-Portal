"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { generateQuestionsForExam } from "@/server/services/exam-question-manager";

export type GenerateActionResult = {
  success: boolean;
  error?: string;
  data?: {
    totalGenerated: number;
    totalFailed: number;
    errors: string[];
  };
};

export async function generateQuestionsAction(
  examId: string,
): Promise<GenerateActionResult> {
  try {
    const result = await generateQuestionsForExam(examId);

    // Force revalidate all related paths
    revalidatePath(`/admin/exams/${examId}`, "page");
    revalidatePath(`/admin/exams/${examId}`, "layout");
    revalidatePath("/admin/questions", "page");
    revalidatePath("/admin/exams", "page");

    return {
      success: true,
      data: {
        totalGenerated: result.totalGenerated,
        totalFailed: result.totalFailed,
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
