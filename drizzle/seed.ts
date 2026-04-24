import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/server/schema";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[&/]/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const topicTree: Record<string, string[]> = {
  "Quantitative Aptitude": [
    "Percentage",
    "Profit & Loss",
    "SI/CI",
    "Time & Work",
    "Time Speed & Distance",
    "Number Series",
    "Data Interpretation",
    "Ratio & Proportion",
    "Average",
    "Mensuration",
    "P&C",
    "Probability",
    "Simplification & Approximation",
    "Quadratic Equations",
  ],
  "Reasoning Ability": [
    "Coding-Decoding",
    "Syllogism",
    "Blood Relations",
    "Direction Sense",
    "Seating Arrangement",
    "Puzzle",
    "Inequality",
    "Series",
    "Analogy",
    "Classification",
    "Input-Output",
    "Order & Ranking",
    "Data Sufficiency",
  ],
  "English Language": [
    "Reading Comprehension",
    "Cloze Test",
    "Error Spotting",
    "Sentence Improvement",
    "Para Jumbles",
    "Fill in the Blanks",
    "Vocabulary",
    "Sentence Rearrangement",
  ],
  "General/Financial Awareness": [
    "Current Affairs",
    "Banking Awareness",
    "Static GK",
    "Financial Awareness",
  ],
  "Computer Knowledge": [
    "Fundamentals",
    "Networking",
    "Database",
    "MS Office",
    "Cyber Security",
  ],
};

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log("Seeding topics...");

  let parentSortOrder = 0;

  for (const [parentName, children] of Object.entries(topicTree)) {
    const parentId = crypto.randomUUID();
    parentSortOrder += 1;

    await db.insert(schema.topics).values({
      id: parentId,
      name: parentName,
      slug: slugify(parentName),
      parentId: null,
      description: `${parentName} section for government exams`,
      sortOrder: parentSortOrder,
      isActive: true,
    });

    console.log(`  Created parent topic: ${parentName}`);

    const childValues = children.map((childName, index) => ({
      id: crypto.randomUUID(),
      name: childName,
      slug: slugify(childName),
      parentId,
      description: `${childName} under ${parentName}`,
      sortOrder: index + 1,
      isActive: true,
    }));

    if (childValues.length > 0) {
      await db.insert(schema.topics).values(childValues);
      console.log(`    Created ${childValues.length} child topics`);
    }
  }

  console.log("Seeding complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
