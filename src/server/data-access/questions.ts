import { db } from "@/server/db";
import { questions } from "@/server/schema";
import { eq, desc, ilike, and, count } from "drizzle-orm";

export async function getQuestions(params: {
  topicId?: string;
  source?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { topicId, source, difficulty, search, page = 1, pageSize = 20 } = params;

  const conditions = [eq(questions.isActive, true)];
  if (topicId) conditions.push(eq(questions.topicId, topicId));
  if (source && source !== "ALL") conditions.push(eq(questions.source, source as any));
  if (difficulty && difficulty !== "ALL") conditions.push(eq(questions.difficulty, difficulty as any));
  if (search) conditions.push(ilike(questions.questionText, `%${search}%`));

  const where = and(...conditions);

  const [data, total] = await Promise.all([
    db.query.questions.findMany({
      where,
      orderBy: [desc(questions.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: { topic: true },
    }),
    db.select({ count: count() }).from(questions).where(where),
  ]);

  return {
    data,
    totalCount: total[0]?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total[0]?.count ?? 0) / pageSize),
  };
}

export async function getQuestionById(id: string) {
  return db.query.questions.findFirst({
    where: eq(questions.id, id),
    with: { topic: true },
  });
}

export async function createQuestion(data: typeof questions.$inferInsert) {
  const [question] = await db.insert(questions).values(data).returning();
  return question;
}

export async function updateQuestion(id: string, data: Partial<typeof questions.$inferInsert>) {
  const [question] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
  return question;
}

export async function deleteQuestion(id: string) {
  // Soft delete
  await db.update(questions).set({ isActive: false }).where(eq(questions.id, id));
}

export async function getQuestionsByExamId(examId: string) {
  return db.query.questions.findMany({
    where: eq(questions.generatedForExamId, examId),
    with: { topic: true },
  });
}
