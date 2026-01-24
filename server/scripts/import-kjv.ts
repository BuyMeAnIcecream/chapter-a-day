import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const KJV_FILE_PATH = path.join(__dirname, '../book/kjv.txt');

// New Testament books in order
const NEW_TESTAMENT_BOOKS = [
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation'
];

interface ParsedVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Parse a single line from the KJV text file
 * Format: BookName Chapter:Verse	Text
 * Example: Matthew 1:1	The book of the generation...
 */
function parseKJVLine(line: string): ParsedVerse | null {
  // Remove leading/trailing whitespace
  line = line.trim();
  
  // Skip empty lines or header lines
  if (!line || line === 'KJV' || line.startsWith('King James')) {
    return null;
  }

  // Pattern: BookName Chapter:Verse	Text
  // Handles book names like "1 Corinthians", "2 John", "Matthew", etc.
  // The tab character separates the verse reference from the text
  // Pattern breakdown:
  // - ([A-Za-z]+(?:\s+\d+)?|[A-Za-z]+) - matches book name (with optional number suffix like "John 3") OR just letters
  // - OR (\d+\s+[A-Za-z]+) - matches numbered books like "1 Corinthians"
  // - \s+(\d+):(\d+)\t - chapter:verse followed by tab
  // - (.+) - verse text
  const pattern = /^((?:\d+\s+)?[A-Za-z]+(?:\s+\d+)?)\s+(\d+):(\d+)\t(.+)$/;
  const match = line.match(pattern);

  if (!match) {
    return null;
  }

  const [, bookName, chapterStr, verseStr, text] = match;
  
  // Normalize book name - trim and ensure proper spacing
  let normalizedBook = bookName.trim();
  
  // Handle numbered books - ensure space between number and name
  // e.g., "1Corinthians" -> "1 Corinthians" (though the file should already have spaces)
  const numberedBookMatch = normalizedBook.match(/^(\d+)([A-Za-z]+)$/);
  if (numberedBookMatch) {
    normalizedBook = `${numberedBookMatch[1]} ${numberedBookMatch[2]}`;
  }

  return {
    book: normalizedBook,
    chapter: parseInt(chapterStr, 10),
    verse: parseInt(verseStr, 10),
    text: text.trim()
  };
}

/**
 * Format verses into chapter content
 * Format: Verse 1: Text\nVerse 2: Text\n...
 */
function formatChapterContent(verses: ParsedVerse[]): string {
  // Sort verses by verse number
  const sortedVerses = [...verses].sort((a, b) => a.verse - b.verse);
  
  // Format as: "1 Text\n2 Text\n3 Text..."
  return sortedVerses
    .map(v => `${v.verse} ${v.text}`)
    .join('\n');
}

/**
 * Extract chapters from KJV text file
 */
async function extractChaptersFromKJV(filePath: string): Promise<Map<string, Map<number, ParsedVerse[]>>> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  // Map: book -> chapter -> verses[]
  const chapters = new Map<string, Map<number, ParsedVerse[]>>();
  
  // Track if we're in New Testament section
  let inNewTestament = false;
  let currentBook: string | null = null;
  
  for (const line of lines) {
    const parsed = parseKJVLine(line);
    
    if (!parsed) {
      continue;
    }
    
    // Check if we've entered New Testament
    if (!inNewTestament && NEW_TESTAMENT_BOOKS.includes(parsed.book)) {
      inNewTestament = true;
    }
    
    // Only process New Testament books
    if (!inNewTestament || !NEW_TESTAMENT_BOOKS.includes(parsed.book)) {
      continue;
    }
    
    // Initialize book map if needed
    if (!chapters.has(parsed.book)) {
      chapters.set(parsed.book, new Map());
    }
    
    const bookChapters = chapters.get(parsed.book)!;
    
    // Initialize chapter array if needed
    if (!bookChapters.has(parsed.chapter)) {
      bookChapters.set(parsed.chapter, []);
    }
    
    // Add verse to chapter
    bookChapters.get(parsed.chapter)!.push(parsed);
  }
  
  return chapters;
}

/**
 * Update database with extracted chapters
 */
async function updateDatabase(chapters: Map<string, Map<number, ParsedVerse[]>>) {
  let updatedCount = 0;
  let notFoundCount = 0;
  
  for (const [bookName, bookChapters] of chapters.entries()) {
    console.log(`\nProcessing ${bookName}...`);
    
    for (const [chapterNumber, verses] of bookChapters.entries()) {
      const chapterContent = formatChapterContent(verses);
      
      // Find the chapter in database
      const chapter = await prisma.chapter.findFirst({
        where: {
          book: bookName,
          chapterNumber: chapterNumber
        }
      });
      
      if (chapter) {
        await prisma.chapter.update({
          where: { id: chapter.id },
          data: { content: chapterContent }
        });
        
        console.log(`  ✓ Updated ${bookName} ${chapterNumber} (${verses.length} verses)`);
        updatedCount++;
      } else {
        console.log(`  ✗ Not found: ${bookName} ${chapterNumber}`);
        notFoundCount++;
      }
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updatedCount} chapters`);
  if (notFoundCount > 0) {
    console.log(`Not found: ${notFoundCount} chapters`);
  }
}

async function main() {
  try {
    console.log('Reading KJV text file...');
    console.log(`File path: ${KJV_FILE_PATH}`);
    
    if (!fs.existsSync(KJV_FILE_PATH)) {
      throw new Error(`KJV file not found at: ${KJV_FILE_PATH}`);
    }
    
    console.log('Parsing KJV text file...');
    const chapters = await extractChaptersFromKJV(KJV_FILE_PATH);
    
    console.log(`\nExtracted chapters:`);
    for (const [bookName, bookChapters] of chapters.entries()) {
      console.log(`  ${bookName}: ${bookChapters.size} chapters`);
    }
    
    console.log('\nUpdating database...');
    await updateDatabase(chapters);
    
    console.log('\nImport completed successfully!');
  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
