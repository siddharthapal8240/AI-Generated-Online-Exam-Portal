import { db } from "@/server/db";
import { exams, examTopicConfigs, examInvitations } from "@/server/schema";
import { eq, desc, ilike, and, sql, count } from "drizzle-orm";

export async function getExams(params: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { status, search, page = 1, pageSize = 20 } = params;

  const conditions = [];
  if (status && status !== "ALL") {
    conditions.push(eq(exams.status, status as any));
  }
  if (search) {
    conditions.push(ilike(exams.title, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, total] = await Promise.all([
    db.query.exams.findMany({
      where,
      orderBy: [desc(exams.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: {
        topicConfigs: {
          with: { topic: true },
        },
        invitations: true,
      },
    }),
    db.select({ count: count() }).from(exams).where(where),
  ]);

  return {
    data,
    totalCount: total[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total[0]?.count ?? 0) / pageSize),
  };
}

export async function getExamById(id: string) {
  return db.query.exams.findFirst({
    where: eq(exams.id, id),
    with: {
      topicConfigs: {
        with: { topic: true },
      },
      invitations: true,
      sessions: {
        with: { user: true },
      },
      createdBy: true,
    },
  });
}

export async function createExam(data: typeof exams.$inferInsert) {
  const [exam] = await db.insert(exams).values(data).returning();
  return exam;
}

export async function updateExam(id: string, data: Partial<typeof exams.$inferInsert>) {
  const [exam] = await db.update(exams).set(data).where(eq(exams.id, id)).returning();
  return exam;
}

export async function deleteExam(id: string) {
  await db.delete(exams).where(eq(exams.id, id));
}

// Topic configs
export async function setExamTopicConfigs(
  examId: string,
  configs: (typeof examTopicConfigs.$inferInsert)[],
) {
  // Delete existing configs for this exam
  await db.delete(examTopicConfigs).where(eq(examTopicConfigs.examId, examId));
  // Insert new configs
  if (configs.length > 0) {
    await db.insert(examTopicConfigs).values(configs);
  }
}

// Invitations
export async function createExamInvitations(
  examId: string,
  emails: string[],
) {
  const values = emails.map((email) => ({
    examId,
    email: email.toLowerCase().trim(),
  }));

  // Use onConflictDoNothing to skip duplicates
  await db.insert(examInvitations).values(values).onConflictDoNothing({
    target: [examInvitations.examId, examInvitations.email],
  });
}

export async function getExamInvitations(examId: string) {
  return db.query.examInvitations.findMany({
    where: eq(examInvitations.examId, examId),
  });
}
