import { db } from "@/server/db";
import { users } from "@/server/schema";
import { eq } from "drizzle-orm";

/**
 * Get or create a user in our database from Clerk user data.
 * Call this whenever you need a local user ID for database operations.
 */
export async function ensureUser(clerkUser: {
  id: string;
  email: string;
  name: string;
  role?: "ADMIN" | "PARTICIPANT";
}) {
  // Check if user already exists by clerkId
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUser.id),
  });

  if (existing) return existing;

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email: clerkUser.email.toLowerCase(),
      name: clerkUser.name || clerkUser.email.split("@")[0],
      role: clerkUser.role || "PARTICIPANT",
    })
    .returning();

  return newUser;
}

export async function getUserByClerkId(clerkId: string) {
  return db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
}

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}
