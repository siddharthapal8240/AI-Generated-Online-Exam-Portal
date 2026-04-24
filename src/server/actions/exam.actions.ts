"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createExam, updateExam, deleteExam, setExamTopicConfigs, createExamInvitations } from "@/server/data-access/exams";
import { createExamSchema, updateExamSchema, inviteParticipantsSchema } from "@/lib/validations/exam.schema";
import { ensureUser } from "@/server/data-access/users";

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

export async function createExamAction(formData: unknown): Promise<ActionResult> {
  try {
    const parsed = createExamSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const input = parsed.data;
    const totalMarks = input.totalQuestions * input.marksPerQuestion;

    // Get current Clerk user and ensure they exist in our DB
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return { success: false, error: "Not authenticated" };
    }
    const dbUser = await ensureUser({
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Admin",
      role: "ADMIN",
    });

    const exam = await createExam({
      title: input.title,
      description: input.description || null,
      instructions: input.instructions || null,
      createdById: dbUser.id,
      status: "DRAFT",
      durationMinutes: input.durationMinutes,
      totalQuestions: input.totalQuestions,
      totalMarks,
      marksPerQuestion: input.marksPerQuestion,
      negativeMarking: input.negativeMarking,
      passingPercentage: input.passingPercentage ?? null,
      targetDifficulty: input.targetDifficulty,
      shuffleQuestions: input.shuffleQuestions,
      showResultInstantly: input.showResultInstantly,
      allowTabSwitch: input.allowTabSwitch,
      maxTabSwitches: input.maxTabSwitches,
      useAiGeneration: input.useAiGeneration,
      usePyqBank: input.usePyqBank,
      scheduledStartTime: input.scheduledStartTime ? new Date(input.scheduledStartTime) : null,
      scheduledEndTime: input.scheduledEndTime ? new Date(input.scheduledEndTime) : null,
    });

    revalidatePath("/admin/exams");
    return { success: true, data: exam };
  } catch (error) {
    console.error("Failed to create exam:", error);
    return { success: false, error: "Failed to create exam" };
  }
}

export async function updateExamAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const parsed = updateExamSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const input = parsed.data;
    const updateData: any = { ...input };

    if (input.totalQuestions && input.marksPerQuestion) {
      updateData.totalMarks = input.totalQuestions * input.marksPerQuestion;
    }
    if (input.scheduledStartTime) {
      updateData.scheduledStartTime = new Date(input.scheduledStartTime);
    }
    if (input.scheduledEndTime) {
      updateData.scheduledEndTime = new Date(input.scheduledEndTime);
    }

    const exam = await updateExam(id, updateData);
    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/${id}`);
    return { success: true, data: exam };
  } catch (error) {
    console.error("Failed to update exam:", error);
    return { success: false, error: "Failed to update exam" };
  }
}

export async function deleteExamAction(id: string): Promise<ActionResult> {
  try {
    await deleteExam(id);
    revalidatePath("/admin/exams");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete exam:", error);
    return { success: false, error: "Failed to delete exam" };
  }
}

export async function updateExamStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const exam = await updateExam(id, { status: status as any });
    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/${id}`);
    return { success: true, data: exam };
  } catch (error) {
    console.error("Failed to update exam status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function inviteParticipantsAction(examId: string, data: unknown): Promise<ActionResult> {
  try {
    const parsed = inviteParticipantsSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    await createExamInvitations(examId, parsed.data.emails);
    revalidatePath(`/admin/exams/${examId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to invite participants:", error);
    return { success: false, error: "Failed to invite participants" };
  }
}

export async function saveExamTopicConfigsAction(
  examId: string,
  configs: { topicId: string; questionCount: number; difficulty: string; pyqPercentage: number; marksPerQuestion: number }[],
): Promise<ActionResult> {
  try {
    await setExamTopicConfigs(
      examId,
      configs.map((c) => ({
        examId,
        topicId: c.topicId,
        questionCount: c.questionCount,
        difficulty: c.difficulty as any,
        pyqPercentage: c.pyqPercentage,
        marksPerQuestion: c.marksPerQuestion,
      })),
    );
    revalidatePath(`/admin/exams/${examId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to save topic configs:", error);
    return { success: false, error: "Failed to save topic configurations" };
  }
}
