import { db } from "@/server/db";
import { topics } from "@/server/schema";
import { eq, isNull, asc } from "drizzle-orm";

export async function getTopics() {
  return db.query.topics.findMany({
    where: eq(topics.isActive, true),
    orderBy: [asc(topics.sortOrder), asc(topics.name)],
  });
}

export async function getTopicsWithChildren() {
  const allTopics = await getTopics();
  const parents = allTopics.filter((t) => !t.parentId);
  return parents.map((parent) => ({
    ...parent,
    children: allTopics.filter((t) => t.parentId === parent.id),
  }));
}

export async function getTopicById(id: string) {
  return db.query.topics.findFirst({
    where: eq(topics.id, id),
  });
}
