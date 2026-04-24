"use server";

import { revalidatePath } from "next/cache";
import { createQuestion, updateQuestion, deleteQuestion } from "@/server/data-access/questions";
import { createQuestionSchema, updateQuestionSchema } from "@/lib/validations/question.schema";

type ActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

export async function createQuestionAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = createQuestionSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const question = await createQuestion({
      ...parsed.data,
      explanation: parsed.data.explanation,
    });

    revalidatePath("/admin/questions");
    return { success: true, data: question };
  } catch (error) {
    console.error("Failed to create question:", error);
    return { success: false, error: "Failed to create question" };
  }
}

export async function updateQuestionAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const parsed = updateQuestionSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const question = await updateQuestion(id, parsed.data);
    revalidatePath("/admin/questions");
    return { success: true, data: question };
  } catch (error) {
    console.error("Failed to update question:", error);
    return { success: false, error: "Failed to update question" };
  }
}

export async function deleteQuestionAction(id: string): Promise<ActionResult> {
  try {
    await deleteQuestion(id);
    revalidatePath("/admin/questions");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete question:", error);
    return { success: false, error: "Failed to delete question" };
  }
}
