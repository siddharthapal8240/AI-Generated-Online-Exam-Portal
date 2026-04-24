import { boolean, index, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

import { userRoleEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clerkId: text("clerk_id").unique().notNull(),
    email: text("email").unique().notNull(),
    name: text("name").notNull(),
    role: userRoleEnum("role").default("PARTICIPANT").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("users_clerk_id_idx").on(table.clerkId),
    index("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ],
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .unique()
      .notNull(),
    avatarUrl: text("avatar_url"),
    targetExam: text("target_exam"),
    preparationLevel: text("preparation_level"),
    totalExamsAttempted: integer("total_exams_attempted").default(0).notNull(),
    averageScore: real("average_score"),
    highestScore: real("highest_score"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("user_profiles_user_id_idx").on(table.userId)],
);
