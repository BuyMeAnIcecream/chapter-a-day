/**
 * One-time script: read server/book/nkjv-chapters.json and update each
 * chapter's contentNkjv in the database. Run with production DATABASE_URL
 * when ready: DATABASE_URL=<url> npx tsx scripts/push-nkjv-to-db.ts
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const JSON_PATH = path.join(__dirname, "../book/nkjv-chapters.json");

function parseKey(key: string): { book: string; chapterNumber: number } | null {
  const lastUnderscore = key.lastIndexOf("_");
  if (lastUnderscore === -1) return null;
  const book = key.slice(0, lastUnderscore);
  const numStr = key.slice(lastUnderscore + 1);
  const chapterNumber = parseInt(numStr, 10);
  if (Number.isNaN(chapterNumber) || chapterNumber < 1) return null;
  return { book, chapterNumber };
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`JSON file not found: ${JSON_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  let data: Record<string, string>;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Invalid JSON:", e);
    process.exit(1);
  }

  const entries = Object.entries(data);
  console.log(`Found ${entries.length} chapters in JSON.`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [key, content] of entries) {
    if (!content || typeof content !== "string") {
      skipped++;
      continue;
    }
    const parsed = parseKey(key);
    if (!parsed) {
      console.warn(`Skipped invalid key: ${key}`);
      skipped++;
      continue;
    }

    const chapter = await prisma.chapter.findFirst({
      where: { book: parsed.book, chapterNumber: parsed.chapterNumber },
    });

    if (!chapter) {
      console.warn(`Chapter not found: ${parsed.book} ${parsed.chapterNumber}`);
      notFound++;
      continue;
    }

    await prisma.chapter.update({
      where: { id: chapter.id },
      data: { contentNkjv: content.trim() },
    });
    updated++;
    console.log(`  Updated ${parsed.book} ${parsed.chapterNumber}`);
  }

  console.log("\n=== Summary ===");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Not found in DB: ${notFound}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
