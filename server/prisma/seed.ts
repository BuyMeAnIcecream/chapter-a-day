import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const newTestamentBooks = [
  { book: "Matthew", chapters: 28 },
  { book: "Mark", chapters: 16 },
  { book: "Luke", chapters: 24 },
  { book: "John", chapters: 21 },
  { book: "Acts", chapters: 28 },
  { book: "Romans", chapters: 16 },
  { book: "1 Corinthians", chapters: 16 },
  { book: "2 Corinthians", chapters: 13 },
  { book: "Galatians", chapters: 6 },
  { book: "Ephesians", chapters: 6 },
  { book: "Philippians", chapters: 4 },
  { book: "Colossians", chapters: 4 },
  { book: "1 Thessalonians", chapters: 5 },
  { book: "2 Thessalonians", chapters: 3 },
  { book: "1 Timothy", chapters: 6 },
  { book: "2 Timothy", chapters: 4 },
  { book: "Titus", chapters: 3 },
  { book: "Philemon", chapters: 1 },
  { book: "Hebrews", chapters: 13 },
  { book: "James", chapters: 5 },
  { book: "1 Peter", chapters: 5 },
  { book: "2 Peter", chapters: 3 },
  { book: "1 John", chapters: 5 },
  { book: "2 John", chapters: 1 },
  { book: "3 John", chapters: 1 },
  { book: "Jude", chapters: 1 },
  { book: "Revelation", chapters: 22 }
];

const makeContent = (book: string, chapter: number) =>
  `${book} ${chapter}\n\nThis is placeholder content for ${book} chapter ${chapter}.`;

async function main() {
  // Always ensure version is up to date
  const latestVersion = "1.1.2";
  const existingVersion = await prisma.appConfig.findUnique({
    where: { key: "version" }
  });
  
  if (!existingVersion) {
    await prisma.appConfig.create({
      data: {
        key: "version",
        value: latestVersion
      }
    });
    console.log(`Initialized version: ${latestVersion}`);
  } else if (existingVersion.value !== latestVersion) {
    await prisma.appConfig.update({
      where: { key: "version" },
      data: { value: latestVersion }
    });
    console.log(`Updated version from ${existingVersion.value} to ${latestVersion}`);
  }

  // Check if chapters already exist
  const existingChapters = await prisma.chapter.count();
  if (existingChapters > 0) {
    // Check if chapters have real content (not placeholder)
    const sampleChapter = await prisma.chapter.findFirst({
      select: { content: true }
    });
    
    const hasRealContent = sampleChapter && 
      !sampleChapter.content.includes('This is placeholder content');
    
    if (hasRealContent) {
      console.log(`Database already has ${existingChapters} chapters with real content. Skipping seed to preserve data.`);
      console.log('To re-import KJV content, use: npm run import:kjv');
      return;
    } else {
      console.log(`Database has ${existingChapters} placeholder chapters. Skipping seed.`);
      console.log('To import real content, use: npm run import:kjv');
      return;
    }
  }

  console.log('Database is empty. Seeding placeholder chapters...');
  // Note: We don't delete here since we've confirmed the database is empty

  let sequence = 1;
  const records = newTestamentBooks.flatMap(({ book, chapters }) => {
    const items = [];
    for (let chapterNumber = 1; chapterNumber <= chapters; chapterNumber += 1) {
      items.push({
        sequence,
        book,
        chapterNumber,
        content: makeContent(book, chapterNumber)
      });
      sequence += 1;
    }
    return items;
  });

  await prisma.chapter.createMany({ data: records });
  console.log(`Seeded ${records.length} chapters.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
