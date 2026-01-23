import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// pdf-parse exports the function directly
const pdfParse = require('pdf-parse');

const prisma = new PrismaClient();

const PDF_PATH = path.join(__dirname, '../../book/study-bible.pdf');
const TOC_PAGE = 3076; // Table of Contents page for New Testament
const START_PAGE = 3076;
const END_PAGE = 3943;

const NEW_TESTAMENT_BOOKS = [
  { book: 'Matthew', chapters: 28, startPage: 3108, endPage: 3183 },
  { book: 'Mark', chapters: 16 },
  { book: 'Luke', chapters: 24 },
  { book: 'John', chapters: 21 },
  { book: 'Acts', chapters: 28 },
  { book: 'Romans', chapters: 16 },
  { book: '1 Corinthians', chapters: 16 },
  { book: '2 Corinthians', chapters: 13 },
  { book: 'Galatians', chapters: 6 },
  { book: 'Ephesians', chapters: 6 },
  { book: 'Philippians', chapters: 4 },
  { book: 'Colossians', chapters: 4 },
  { book: '1 Thessalonians', chapters: 5 },
  { book: '2 Thessalonians', chapters: 3 },
  { book: '1 Timothy', chapters: 6 },
  { book: '2 Timothy', chapters: 4 },
  { book: 'Titus', chapters: 3 },
  { book: 'Philemon', chapters: 1 },
  { book: 'Hebrews', chapters: 13 },
  { book: 'James', chapters: 5 },
  { book: '1 Peter', chapters: 5 },
  { book: '2 Peter', chapters: 3 },
  { book: '1 John', chapters: 5 },
  { book: '2 John', chapters: 1 },
  { book: '3 John', chapters: 1 },
  { book: 'Jude', chapters: 1 },
  { book: 'Revelation', chapters: 22 }
];

// Create regex patterns for chapter detection
function createChapterPatterns(bookName: string): RegExp[] {
  const patterns: RegExp[] = [];
  
  // Pattern 1: "Matthew 1" or "MATTHEW 1" or "Matthew Chapter 1"
  patterns.push(new RegExp(`^${bookName}\\s+(?:Chapter\\s+)?(\\d+)`, 'i'));
  
  // Pattern 2: "Chapter 1" when we know the book context
  patterns.push(new RegExp(`^Chapter\\s+(\\d+)`, 'i'));
  
  // Pattern 3: Just the number "1" at start of line (less reliable)
  patterns.push(new RegExp(`^\\s*(\\d+)\\s*$`, 'm'));
  
  return patterns;
}

// Clean extracted text
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
    .trim();
}

// Check if a line looks like navigation/index page content
function isNavigationLine(line: string): boolean {
  const navPatterns = [
    /^Home\s*$/i,
    /^Next\s*$/i,
    /^Back to/i,
    /^Chapters in/i,
    /^Table of Contents/i,
    /^Introduction\s*$/i,
    /^\d+,\s*\d+/i, // "1, 2, 3, 4" - chapter lists
    /^M\s+A\s+T\s+T\s+H\s+E\s+W/i, // Spaced out book names
    /^[A-Z]\s+[A-Z]\s+[A-Z]/i, // Multiple spaced capital letters
  ];
  
  return navPatterns.some(pattern => pattern.test(line));
}

// Check if a line looks like an outline/section heading
function isOutlineLine(line: string): boolean {
  // Outline patterns: section headings, cross-references in parentheses
  const outlinePatterns = [
    /^\([A-Z][a-z]+\s+\d+:\d+[–-]\d+\)\s*$/, // Cross-reference like "(Lk 3:23–38)"
    /^\([A-Z][a-z]+\s+\d+:\d+\)\s*$/, // Single verse reference like "(Mt 1:1)"
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*$/, // Title case heading (but not if it's followed by verse content)
  ];
  
  // Don't treat as outline if it's followed by verse content
  return outlinePatterns.some(pattern => pattern.test(line));
}

// Check if a line looks like actual biblical verse content
function isVerseContent(line: string): boolean {
  // Verse content typically starts with a number followed by text
  const versePatterns = [
    /^\s*\d+\s+[A-Z]/, // "1 In the beginning..." or "1 The book..."
    /^\s*\d+\s+[a-z]/, // "1 and it came to pass..."
    /^\s*\d+\s+["']/, // "1 "How does..."
  ];
  
  return versePatterns.some(pattern => pattern.test(line));
}

// Check if we're in a navigation section (multiple navigation lines in a row)
function isInNavigationSection(lines: string[], currentIndex: number, lookAhead: number = 10): boolean {
  let navLineCount = 0;
  for (let i = currentIndex; i < Math.min(currentIndex + lookAhead, lines.length); i++) {
    if (isNavigationLine(lines[i].trim())) {
      navLineCount++;
    }
  }
  // If more than 2 navigation lines in next 10 lines, we're probably in navigation
  return navLineCount >= 2;
}

// Extract chapter content from text
function extractChapters(
  fullText: string,
  books: typeof NEW_TESTAMENT_BOOKS
): Map<string, string> {
  const chapters = new Map<string, string>();
  const lines = fullText.split('\n');
  
  // Build a map of book names to their data for quick lookup
  const bookMap = new Map<string, typeof NEW_TESTAMENT_BOOKS[0]>();
  books.forEach(book => {
    bookMap.set(book.book.toLowerCase(), book);
    // Also add variations
    if (book.book.includes(' ')) {
      const parts = book.book.split(' ');
      bookMap.set(parts[1].toLowerCase(), book); // e.g., "corinthians" for "1 Corinthians"
    }
  });
  
  let currentBook: typeof NEW_TESTAMENT_BOOKS[0] | null = null;
  let currentChapter = 0;
  let chapterContent: string[] = [];
  let inChapter = false;
  let skipNavigation = true; // Start by skipping navigation
  let consecutiveNavLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      consecutiveNavLines = 0;
      continue;
    }
    
    // Check if this is a navigation line
    const isNav = isNavigationLine(line);
    if (isNav) {
      consecutiveNavLines++;
      // If we see multiple navigation lines, we're in a navigation section
      if (consecutiveNavLines >= 2) {
        skipNavigation = true;
        // Reset chapter tracking when entering navigation
        if (inChapter && currentChapter > 0 && currentBook) {
          // Save current chapter before navigation
          const key = `${currentBook.book}_${currentChapter}`;
          const content = cleanText(chapterContent.join('\n'));
          if (content.length > 100 && !chapters.has(key)) {
            chapters.set(key, content);
            console.log(`  Extracted ${currentBook.book} ${currentChapter} (${content.length} chars)`);
          }
          chapterContent = [];
          inChapter = false;
        }
      }
      continue;
    }
    
    // Reset navigation counter when we see non-nav content
    consecutiveNavLines = 0;
    
    // Skip outline lines (section headings, cross-references) unless we're already in chapter content
    if (!inChapter && isOutlineLine(line)) {
      // This might be a section heading - check if next line is verse content
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (isVerseContent(nextLine)) {
          // This is a section heading before verse content - include it
          // Don't skip, let it be processed below
          // But mark that we're starting chapter content
          if (currentBook && currentChapter === 0) {
            currentChapter = 1;
            chapterContent = [];
            inChapter = true;
          }
        } else {
          // Just an outline line, skip it
          continue;
        }
      } else {
        continue; // Last line, skip outline
      }
    }
    
    // If we have a book but no chapter yet, and we see verse content, start chapter 1
    if (currentBook && currentChapter === 0 && isVerseContent(line)) {
      currentChapter = 1;
      chapterContent = [];
      inChapter = true;
    }
    
    // Try to detect book start - look for book name (not in navigation)
    // Process books in order - only look for the next expected book
    if (!currentBook) {
      // Find which book we should be looking for based on what we've processed
      const processedBooks = Array.from(chapters.keys()).map(k => k.split('_')[0]);
      const lastProcessedBook = processedBooks.length > 0 
        ? NEW_TESTAMENT_BOOKS.findIndex(b => b.book === processedBooks[processedBooks.length - 1])
        : -1;
      const nextBookIndex = lastProcessedBook + 1;
      
      // Look for the next book in sequence
      const bookToFind = nextBookIndex < NEW_TESTAMENT_BOOKS.length 
        ? NEW_TESTAMENT_BOOKS[nextBookIndex]
        : NEW_TESTAMENT_BOOKS[0]; // Start with first if none processed
      
      // Look for book name as a standalone line or with "THE GOSPEL ACCORDING TO" prefix
      const bookStandalonePattern = new RegExp(`^${bookToFind.book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
      const bookWithPrefixPattern = new RegExp(`(?:THE\\s+GOSPEL\\s+ACCORDING\\s+TO\\s+)?${bookToFind.book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
      
      if (bookStandalonePattern.test(line) || bookWithPrefixPattern.test(line)) {
        // Check if the next few lines contain navigation or actual content
        let lookAheadIndex = i + 1;
        let foundContent = false;
        let foundNav = false;
        
        // Check next 20 lines
        for (let j = 0; j < 20 && lookAheadIndex < lines.length; j++, lookAheadIndex++) {
          const nextLine = lines[lookAheadIndex].trim();
          if (!nextLine) continue;
          
          if (isNavigationLine(nextLine)) {
            foundNav = true;
          } else if (/^\d+\s+[A-Z]/.test(nextLine) || (/^[A-Z][a-z]+/.test(nextLine) && nextLine.length > 30)) {
            // Looks like verse content or substantial biblical text
            foundContent = true;
            break;
          }
        }
        
        // Only set as current book if we found content (not just navigation)
        // Also require we're past line 1000 to avoid acknowledgments
        if ((foundContent || (!foundNav && i > 1000)) && i > 500) {
          currentBook = bookToFind;
          currentChapter = 0;
          chapterContent = [];
          inChapter = false;
          skipNavigation = foundNav; // Skip navigation if we detected it
          console.log(`Found book: ${bookToFind.book} at line ${i} (navigation: ${foundNav}, content: ${foundContent})`);
        }
      }
      if (!currentBook) continue; // Still looking for book
    }
    
    // If we're skipping navigation, look for actual content indicators
    if (skipNavigation && currentBook) {
      // Look for verse patterns like "1 " at start of line (verse 1 of a chapter)
      // or section headings followed by verse content, or chapter number patterns
      const verseOnePattern = /^\s*1\s+[A-Z]/; // "1 " followed by capital letter (verse 1)
      const verseNumberPattern = /^\s*\d+\s+[A-Za-z]/; // Any verse number followed by text
      const chapterHeaderPattern = new RegExp(`^${currentBook.book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(\\d+)\\s*$`, 'i');
      
      // Check if this looks like actual biblical content (not navigation)
      // Section headings like "The Genealogy of Jesus" followed by cross-references are OK
      const looksLikeContent = verseOnePattern.test(line) || 
                               verseNumberPattern.test(line) ||
                               chapterHeaderPattern.test(line) ||
                               (isOutlineLine(line) && i + 1 < lines.length && isVerseContent(lines[i + 1].trim())) ||
                               (/^[A-Z][a-z]+/.test(line) && line.length > 50 && !isNavigationLine(line));
      
      if (looksLikeContent) {
        // Double-check: look ahead a few lines to confirm we're past navigation
        let confirmContent = false;
        for (let j = 1; j <= 5 && (i + j) < lines.length; j++) {
          const nextLine = lines[i + j].trim();
          if (nextLine && (verseNumberPattern.test(nextLine) || (/^[A-Z][a-z]+/.test(nextLine) && nextLine.length > 30))) {
            confirmContent = true;
            break;
          }
        }
        
        if (confirmContent || verseOnePattern.test(line) || chapterHeaderPattern.test(line) || isVerseContent(line)) {
          skipNavigation = false; // We found actual content
          // If it's a chapter header, extract the chapter number
          const headerMatch = line.match(chapterHeaderPattern);
          if (headerMatch) {
            const chapterNum = parseInt(headerMatch[1], 10);
            if (chapterNum > 0 && chapterNum <= currentBook.chapters) {
              // Save previous chapter if exists
              if (currentChapter > 0 && chapterContent.length > 0) {
                const key = `${currentBook.book}_${currentChapter}`;
                const content = cleanText(chapterContent.join('\n'));
                if (content.length > 100 && !chapters.has(key)) {
                  chapters.set(key, content);
                  console.log(`  Extracted ${currentBook.book} ${currentChapter} (${content.length} chars)`);
                }
              }
              currentChapter = chapterNum;
              chapterContent = [line];
              inChapter = true;
            }
          } else if (verseOnePattern.test(line)) {
            // Starting verse 1, assume chapter 1 or next chapter
            if (currentChapter === 0) {
              currentChapter = 1;
              chapterContent = [line];
              inChapter = true;
            } else if (chapterContent.length > 50) {
              // Might be next chapter - save current and start new
              const key = `${currentBook.book}_${currentChapter}`;
              const content = cleanText(chapterContent.join('\n'));
              if (content.length > 100 && !chapters.has(key)) {
                chapters.set(key, content);
                console.log(`  Extracted ${currentBook.book} ${currentChapter} (${content.length} chars)`);
              }
              currentChapter = Math.min(currentChapter + 1, currentBook.chapters);
              chapterContent = [line];
            } else {
              chapterContent.push(line);
            }
          } else {
            // Section heading or other content - add to current chapter
            if (currentChapter === 0) currentChapter = 1;
            chapterContent.push(line);
            inChapter = true;
          }
        }
      }
      
      if (skipNavigation) {
        continue; // Still in navigation, skip this line
      }
    }
    
    // If we're not skipping navigation and have a current book, process content
    if (!skipNavigation && currentBook) {
      // Try to detect new chapter - look for explicit chapter headers first
      const bookNamePattern = new RegExp(`^${currentBook.book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(\\d+)\\s*$`, 'i');
      const chapterMatch = line.match(bookNamePattern);
      
      if (chapterMatch) {
        const chapterNum = parseInt(chapterMatch[1], 10);
        if (chapterNum > 0 && chapterNum <= currentBook.chapters) {
          // Save previous chapter
          if (currentChapter > 0 && chapterContent.length > 0) {
            const key = `${currentBook.book}_${currentChapter}`;
            const content = cleanText(chapterContent.join('\n'));
            if (content.length > 100 && !chapters.has(key)) {
              chapters.set(key, content);
              console.log(`  Extracted ${currentBook.book} ${currentChapter} (${content.length} chars)`);
            }
          }
          currentChapter = chapterNum;
          chapterContent = [line];
          inChapter = true;
        }
      } else if (inChapter) {
        // Look for verse 1 pattern - this often indicates a new chapter
        const verseOnePattern = /^\s*1\s+[A-Z]/;
        
        if (verseOnePattern.test(line) && currentChapter > 0 && currentChapter < currentBook.chapters) {
          // Check if we have substantial content for current chapter
          // and if the next chapter hasn't been extracted yet
          const currentKey = `${currentBook.book}_${currentChapter}`;
          const nextKey = `${currentBook.book}_${currentChapter + 1}`;
          
          if (chapterContent.length > 100 && !chapters.has(nextKey)) {
            // Look ahead to confirm this is really a new chapter
            // Check if next few lines look like chapter content (not just verse 1 of current chapter)
            let looksLikeNewChapter = false;
            for (let j = 1; j <= 3 && (i + j) < lines.length; j++) {
              const nextLine = lines[i + j].trim();
              if (nextLine && /^\s*2\s+[A-Z]/.test(nextLine)) {
                // Found verse 2, this is likely a new chapter
                looksLikeNewChapter = true;
                break;
              }
            }
            
            // Only treat as new chapter if we have reasonable content size
            // Typical chapter is 5k-100k chars, so if we're over 200k, we're probably capturing too much
            const currentContentLength = chapterContent.join('\n').length;
            const reasonableChapterSize = currentContentLength < 200000;
            
            if ((looksLikeNewChapter && reasonableChapterSize) || (currentContentLength > 500 && currentContentLength < 150000)) {
              // Save current chapter and start new one
              const content = cleanText(chapterContent.join('\n'));
              if (content.length > 100 && !chapters.has(currentKey)) {
                chapters.set(currentKey, content);
                console.log(`  Extracted ${currentBook.book} ${currentChapter} (${content.length} chars)`);
              }
              currentChapter = currentChapter + 1;
              chapterContent = [line];
            } else if (currentContentLength > 200000) {
              // Content is too large - we might have missed a chapter boundary or moved to next book
              // Check if we've moved to the next book
              if (!currentBook) continue;
              const currentBookIndex = books.findIndex(b => b.book === currentBook.book);
              if (currentBookIndex >= 0 && currentBookIndex < books.length - 1) {
                const nextBook = books[currentBookIndex + 1];
                // Check if next book name appears in recent content
                const recentContent = chapterContent.slice(-50).join('\n');
                if (new RegExp(`\\b${nextBook.book}\\b`, 'i').test(recentContent)) {
                  // Next book detected - save current chapter (truncated) and move on
                  const content = cleanText(chapterContent.slice(0, -50).join('\n'));
                  if (content.length > 100 && !chapters.has(currentKey)) {
                    const truncated = content.substring(0, 150000);
                    chapters.set(currentKey, truncated);
                    console.log(`  Extracted ${currentBook.book} ${currentChapter} (${truncated.length} chars, truncated)`);
                  }
                  // Move to next book
                  currentBook = null;
                  currentChapter = 0;
                  inChapter = false;
                  skipNavigation = true;
                  continue;
                }
              }
              
              // Not next book, but content too large - save truncated and move to next chapter
              const content = cleanText(chapterContent.join('\n'));
              if (content.length > 100 && !chapters.has(currentKey)) {
                const truncated = content.substring(0, 150000);
                chapters.set(currentKey, truncated);
                console.log(`  Extracted ${currentBook.book} ${currentChapter} (${truncated.length} chars, truncated from ${content.length})`);
              }
              currentChapter = currentChapter + 1;
              chapterContent = [line];
            } else {
              // Probably still in current chapter
              chapterContent.push(line);
            }
          } else {
            chapterContent.push(line);
          }
        } else {
          // Collect content for current chapter
          chapterContent.push(line);
        }
      }
      
      // Check if we've moved to the next book (detect next book name in current line or recent content)
      if (!currentBook) continue;
      const currentBookIndex = books.findIndex(b => b.book === currentBook.book);
      if (currentBookIndex >= 0 && currentBookIndex < books.length - 1) {
        const nextBook = books[currentBookIndex + 1];
        const nextBookPattern = new RegExp(`^${nextBook.book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
        const nextBookInContent = new RegExp(`\\b${nextBook.book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        // Check current line or recent content for next book
        if (nextBookPattern.test(line) || (chapterContent.length > 10 && nextBookInContent.test(chapterContent.slice(-10).join('\n')))) {
          // Found next book - save current chapter and move on
          if (currentChapter > 0 && chapterContent.length > 0) {
            const key = `${currentBook.book}_${currentChapter}`;
            // Remove any lines that contain next book name
            const filteredContent = chapterContent.filter(l => !nextBookInContent.test(l));
            const content = cleanText(filteredContent.join('\n'));
            if (content.length > 100 && !chapters.has(key)) {
              chapters.set(key, content);
              console.log(`  Extracted ${currentBook.book} ${currentChapter} (${content.length} chars)`);
            }
          }
          // Move to next book
          currentBook = null;
          currentChapter = 0;
          inChapter = false;
          skipNavigation = true;
          if (nextBookPattern.test(line)) {
            continue; // Process this line again as the new book
          }
        }
      }
      
      // Check if we've completed all chapters for this book
      if (!currentBook) continue;
      
      if (currentChapter >= currentBook.chapters && chapterContent.length > 100) {
        // Save last chapter
        const key = `${currentBook.book}_${currentChapter}`;
        const content = cleanText(chapterContent.join('\n'));
        if (content.length > 100 && !chapters.has(key)) {
          chapters.set(key, content);
          console.log(`  Extracted ${currentBook.book} ${currentChapter} (${content.length} chars)`);
        }
        
        // Move to next book
        if (currentBookIndex < books.length - 1) {
          currentBook = null;
          currentChapter = 0;
          inChapter = false;
          skipNavigation = true; // Next book will start with navigation
        } else {
          break; // All books processed
        }
      }
    }
  }
  
  // Save the last chapter if we have content
  if (currentBook && currentChapter > 0 && chapterContent.length > 0) {
    const key = `${currentBook.book}_${currentChapter}`;
    const content = cleanText(chapterContent.join('\n'));
    if (content.length > 100 && !chapters.has(key)) {
      chapters.set(key, content);
      console.log(`  Extracted ${currentBook.book} ${currentChapter} (${content.length} chars)`);
    }
  }
  
  return chapters;
}

// Extract all hyperlinks from the PDF
async function getAllHyperlinks(parser: any): Promise<any[]> {
  try {
    if (typeof parser.getHyperlinks === 'function') {
      const hyperlinks = await parser.getHyperlinks();
      return Array.isArray(hyperlinks) ? hyperlinks : [];
    }
    return [];
  } catch (error: any) {
    console.warn(`Could not extract hyperlinks: ${error.message}`);
    return [];
  }
}

// Extract links from a specific page
async function getPageLinks(parser: any, pageNumber: number): Promise<any[]> {
  try {
    // First try to get all hyperlinks and filter by page
    const allHyperlinks = await getAllHyperlinks(parser);
    if (allHyperlinks.length > 0) {
      // Filter links that are on or point to this page
      const pageLinks = allHyperlinks.filter((link: any) => {
        // Links might have different properties: page, pageNumber, dest, etc.
        const linkPage = link.page !== undefined ? link.page + 1 : 
                        link.pageNumber || 
                        (link.dest && link.dest[0] && link.dest[0] + 1);
        return linkPage === pageNumber;
      });
      if (pageLinks.length > 0) {
        return pageLinks;
      }
    }
    
    // Try direct page link extraction (may not work due to API limitations)
    if (typeof parser.getPageLinks === 'function') {
      try {
        const links = await parser.getPageLinks(pageNumber - 1); // 0-indexed
        if (Array.isArray(links)) {
          return links;
        }
      } catch (e) {
        // Method exists but may need different context
      }
    }
    
    return [];
  } catch (error: any) {
    console.warn(`Could not extract links from page ${pageNumber}: ${error.message}`);
    return [];
  }
}

// Get text from a specific page (if supported)
async function getPageText(parser: any, pageNumber: number): Promise<string> {
  try {
    if (typeof parser.getPageText === 'function') {
      const text = await parser.getPageText(pageNumber - 1); // 0-indexed
      return text || '';
    }
    return '';
  } catch (error: any) {
    console.warn(`Could not extract text from page ${pageNumber}: ${error.message}`);
    return '';
  }
}

// Extract chapters using exact page ranges
async function extractChaptersByPageRanges(
  parser: any,
  fullText: string
): Promise<Map<string, string>> {
  const chapters = new Map<string, string>();
  
  console.log('\n=== Extracting chapters using page ranges ===');
  
  const lines = fullText.split('\n');
  const pageMarkers: Map<number, number> = new Map(); // page number -> line index
  
  // Find all page markers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pageMatch = line.match(/--\s*(\d+)\s+of\s+\d+\s*--/);
    if (pageMatch) {
      const pageNum = parseInt(pageMatch[1], 10);
      pageMarkers.set(pageNum, i);
    }
  }
  
  console.log(`Found ${pageMarkers.size} page markers`);
  
  // Extract chapters for each book with known page ranges
  for (const book of NEW_TESTAMENT_BOOKS) {
    if (!('startPage' in book) || !book.startPage || !book.endPage) {
      console.log(`\nSkipping ${book.book} - no page range defined`);
      continue;
    }
    
    const startPage = book.startPage;
    const endPage = book.endPage;
    
    console.log(`\nProcessing ${book.book} (pages ${startPage}-${endPage})`);
    
    // Find line indices for start and end pages
    const startLine = pageMarkers.get(startPage);
    const endLine = pageMarkers.get(endPage);
    
    if (!startLine || !endLine) {
      console.log(`  Could not find page markers for ${book.book}`);
      continue;
    }
    
    console.log(`  Found text range: lines ${startLine}-${endLine}`);
    
    // Extract text for this book
    const bookLines = lines.slice(startLine, endLine + 1);
    const bookText = bookLines.join('\n');
    
    // Extract chapters from this book's text
    const bookChapters = extractChaptersFromBookText(bookText, book);
    
    // Add to main chapters map
    for (const [key, content] of bookChapters.entries()) {
      chapters.set(key, content);
      console.log(`  Extracted ${key} (${content.length} chars)`);
    }
  }
  
  return chapters;
}

// Extract chapters from a book's text
function extractChaptersFromBookText(
  bookText: string,
  book: typeof NEW_TESTAMENT_BOOKS[0] & { startPage?: number; endPage?: number }
): Map<string, string> {
  const chapters = new Map<string, string>();
  const lines = bookText.split('\n');
  
  let currentChapter = 0;
  let chapterContent: string[] = [];
  // Verse pattern: number at start of line followed by text
  const versePattern = /^\s*(\d+)\s+[A-Za-z"']/;
  // Also match standalone verse numbers
  const verseNumberPattern = /^\s*(\d+)\s*$/;
  
  console.log(`  Processing ${lines.length} lines for ${book.book}`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentChapter > 0) {
        chapterContent.push(''); // Preserve blank lines
      }
      continue;
    }
    
    // Skip navigation pages
    if (/^Home\s*$/i.test(line) || /^Next\s*$/i.test(line) || /^Back to/i.test(line) || 
        /^Chapters in/i.test(line) || /^Verses in/i.test(line) || /^\d+,\s*\d+/.test(line)) {
      // Save current chapter if we have content before navigation
      if (currentChapter > 0 && chapterContent.length > 0) {
        const key = `${book.book}_${currentChapter}`;
        const content = cleanText(chapterContent.join('\n'));
        if (content.length > 100) {
          chapters.set(key, content);
          console.log(`    Found ${book.book} ${currentChapter} (${content.length} chars)`);
        }
        chapterContent = [];
      }
      continue;
    }
    
    // Detect verse 1 (new chapter) - must be at start of line followed by text
    if (versePattern.test(line)) {
      const verseMatch = line.match(versePattern);
      const verseNum = parseInt(verseMatch![1], 10);
      
      if (verseNum === 1) {
        // This is verse 1 - check if it's a new chapter
        // Look for evidence we've completed the previous chapter:
        // - We've seen verse numbers > 1 recently
        // - We have substantial content
        
        let isNewChapter = false;
        
        if (currentChapter === 0) {
          // First chapter
          isNewChapter = true;
        } else if (chapterContent.length > 10) {
          // Check if we've seen verse 2+ anywhere in current chapter
          let foundHigherVerse = false;
          
          for (const prevLine of chapterContent) {
            if (versePattern.test(prevLine)) {
              const match = prevLine.match(versePattern);
              if (match && parseInt(match[1], 10) > 1) {
                foundHigherVerse = true;
                break;
              }
            }
          }
          
          // If we've seen verse 2+ in this chapter, this verse 1 is a new chapter
          // Also check if current chapter is getting too large (>15k chars = likely multiple chapters)
          const currentContentSize = chapterContent.join('\n').length;
          if (foundHigherVerse || currentContentSize > 15000) {
            isNewChapter = true;
          }
        }
        
        if (isNewChapter) {
          // Save previous chapter
          if (currentChapter > 0 && chapterContent.length > 0) {
            const key = `${book.book}_${currentChapter}`;
            const content = cleanText(chapterContent.join('\n'));
            if (content.length > 100) {
              chapters.set(key, content);
              console.log(`    Found ${book.book} ${currentChapter} (${content.length} chars)`);
            }
          }
          // Start new chapter
          currentChapter++;
          chapterContent = [line];
        } else if (currentChapter === 0) {
          // First chapter
          currentChapter = 1;
          chapterContent = [line];
        } else {
          // Still in current chapter (first verse 1)
          chapterContent.push(line);
        }
      } else {
        // Continue current chapter (verse 2, 3, etc.)
        if (currentChapter === 0) currentChapter = 1;
        chapterContent.push(line);
      }
    } else if (currentChapter > 0) {
      // Continue collecting content
      chapterContent.push(line);
    } else {
      // Before first chapter - might be section heading
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (versePattern.test(nextLine)) {
          const verseMatch = nextLine.match(versePattern);
          if (parseInt(verseMatch![1], 10) === 1) {
            currentChapter = 1;
            chapterContent = [line];
          }
        }
      }
    }
  }
  
  // Save last chapter
  if (currentChapter > 0 && chapterContent.length > 0) {
    const key = `${book.book}_${currentChapter}`;
    const content = cleanText(chapterContent.join('\n'));
    if (content.length > 100) {
      chapters.set(key, content);
      console.log(`    Found ${book.book} ${currentChapter} (${content.length} chars)`);
    }
  }
  
  console.log(`  Total: Extracted chapters 1-${currentChapter} for ${book.book}`);
  
  return chapters;
}

// Extract chapters using link navigation (deprecated - keeping for reference)
async function extractChaptersViaLinks(
  parser: any,
  fullText: string
): Promise<Map<string, string>> {
  const chapters = new Map<string, string>();
  
  console.log('\n=== Attempting link-based extraction ===');
  console.log(`Starting from TOC page ${TOC_PAGE}...`);
  
  try {
    // Step 1: Try to get all hyperlinks first
    console.log('Extracting all hyperlinks from PDF...');
    const allHyperlinks = await getAllHyperlinks(parser);
    console.log(`Found ${allHyperlinks.length} total hyperlinks in PDF`);
    
    if (allHyperlinks.length > 0) {
      console.log('\n=== Hyperlink Structure Analysis ===');
      console.log('Sample hyperlink:');
      console.log(JSON.stringify(allHyperlinks[0], null, 2));
      console.log('\nHyperlink properties:', Object.keys(allHyperlinks[0]));
      
      // Filter hyperlinks around TOC page (within a range)
      const tocRangeStart = TOC_PAGE - 5;
      const tocRangeEnd = TOC_PAGE + 5;
      const tocLinks = allHyperlinks.filter((link: any) => {
        const linkPage = link.page !== undefined ? link.page + 1 : 
                        link.pageNumber || 
                        (link.dest && Array.isArray(link.dest) && link.dest[0] ? link.dest[0] + 1 : null);
        return linkPage && linkPage >= tocRangeStart && linkPage <= tocRangeEnd;
      });
      
      console.log(`\nFound ${tocLinks.length} hyperlinks near TOC page ${TOC_PAGE}`);
      
      if (tocLinks.length === 0) {
        // Try getting links specifically from TOC page
        const pageLinks = await getPageLinks(parser, TOC_PAGE);
        if (pageLinks.length > 0) {
          console.log(`Found ${pageLinks.length} links on TOC page ${TOC_PAGE}`);
          return await processLinksForChapters(parser, pageLinks, allHyperlinks);
        }
      } else {
        return await processLinksForChapters(parser, tocLinks, allHyperlinks);
      }
    }
    
    // Fallback: try page-specific links
    const tocLinks = await getPageLinks(parser, TOC_PAGE);
    console.log(`Found ${tocLinks.length} links on TOC page ${TOC_PAGE}`);
    
    if (tocLinks.length === 0) {
      console.log('\nNo links found.');
      console.log('This PDF may use a different link structure or links may be embedded as annotations.');
      console.log('Falling back to text-based extraction...');
      return chapters; // Return empty, will fallback to text-based
    }
    
    return await processLinksForChapters(parser, tocLinks, allHyperlinks);
    
  } catch (error: any) {
    console.log(`\nLink extraction error: ${error.message}`);
    if (error.stack) {
      console.log('Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    console.log('Falling back to text-based extraction...');
  }
  
  return chapters;
}

// Process links to extract chapters
async function processLinksForChapters(
  parser: any,
  tocLinks: any[],
  allHyperlinks: any[]
): Promise<Map<string, string>> {
  const chapters = new Map<string, string>();
  
  console.log('\n=== Processing Links for Chapter Extraction ===');
  
  // Step 1: Map TOC links to book pages
  const bookPageMap = new Map<string, number>();
  
  // Get text from TOC page to help match links to books
  const tocText = await getPageText(parser, TOC_PAGE);
  const tocLines = tocText.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log(`TOC page has ${tocLines.length} text lines`);
  
  // Try to match links to books based on position or text
  for (const book of NEW_TESTAMENT_BOOKS) {
    // Find book name in TOC text
    const bookIndex = tocLines.findIndex(line => 
      line.toLowerCase().includes(book.book.toLowerCase())
    );
    
    if (bookIndex >= 0) {
      // Try to find a link near this text position
      // This is heuristic - actual implementation depends on link structure
      for (const link of tocLinks) {
        // If link has coordinates, we could match by position
        // For now, we'll use a simpler approach: match by order
        const linkPage = link.page !== undefined ? link.page + 1 : 
                        link.pageNumber || 
                        (link.dest && Array.isArray(link.dest) && link.dest[0] ? link.dest[0] + 1 : null);
        
        if (linkPage && linkPage > TOC_PAGE && linkPage <= END_PAGE) {
          // This might be a book page
          if (!bookPageMap.has(book.book)) {
            bookPageMap.set(book.book, linkPage);
            console.log(`  Mapped ${book.book} -> page ${linkPage}`);
            break;
          }
        }
      }
    }
  }
  
  if (bookPageMap.size === 0) {
    console.log('\nCould not map links to books automatically.');
    console.log('Link-based extraction requires understanding the specific PDF structure.');
    console.log('Falling back to text-based extraction...');
    return chapters;
  }
  
  console.log(`\nMapped ${bookPageMap.size} books to pages`);
  
  // Step 2: For each book page, extract chapter links
  // Step 3: For each chapter, extract verse links and content
  // This would require:
  //   - Following links from book page to chapter pages
  //   - Following links from chapter pages to verse pages  
  //   - Extracting text from verse pages and combining into chapters
  
  console.log('\nLink-based extraction framework is in place.');
  console.log('To complete implementation:');
  console.log('  1. Understand the link structure (page numbers, destinations)');
  console.log('  2. Map book links to their pages');
  console.log('  3. Extract chapter links from each book page');
  console.log('  4. Extract verse links from each chapter page');
  console.log('  5. Follow verse links to get actual content');
  console.log('  6. Combine verses into chapter content');
  console.log('\nNote: pdf-parse link extraction may require browser environment or different library.');
  console.log('For now, using text-based extraction with improved logic...');
  
  return chapters;
}

async function main() {
  console.log('Starting PDF import (with link navigation support)...');
  console.log(`PDF path: ${PDF_PATH}`);
  console.log(`TOC page: ${TOC_PAGE}`);
  console.log(`Page range: ${START_PAGE} to ${END_PAGE}`);
  
  // Check if PDF exists
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`Error: PDF file not found at ${PDF_PATH}`);
    console.error('Please ensure book/study-bible.pdf exists');
    process.exit(1);
  }
  
  // Read PDF
  console.log('Reading PDF...');
  const dataBuffer = fs.readFileSync(PDF_PATH);
  
  console.log('Parsing PDF (this may take a while)...');
  // pdf-parse v2+ uses PDFParse class with getText() method
  const PDFParse = pdfParse.PDFParse;
  if (!PDFParse) {
    throw new Error('PDFParse class not found in pdf-parse module');
  }
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  const numPages = result.numpages || 0;
  const fullText = result.text;
  
  console.log(`Total pages in PDF: ${numPages}`);
  console.log(`Target pages: ${START_PAGE} to ${END_PAGE}`);
  console.log(`Extracted ${fullText.length} characters of text`);
  
  // Debug: Show sample of text to understand structure
  console.log('\n=== Analyzing PDF structure ===');
  // Look for navigation patterns
  const navPatterns = ['Home', 'Next', 'Back to', 'Chapters in', 'Table of Contents'];
  let navFound = false;
  for (const pattern of navPatterns) {
    if (fullText.includes(pattern)) {
      console.log(`Found navigation pattern: "${pattern}"`);
      navFound = true;
    }
  }
  if (navFound) {
    console.log('Navigation pages detected - will skip them during extraction');
  }
  
  // Find first occurrence of each New Testament book to understand structure
  console.log('\n=== Book locations in PDF ===');
  for (const book of NEW_TESTAMENT_BOOKS.slice(0, 5)) {
    const idx = fullText.indexOf(book.book);
    if (idx >= 0) {
      const percent = ((idx / fullText.length) * 100).toFixed(1);
      console.log(`"${book.book}" at position ${idx} (${percent}% through text)`);
    }
  }
  
  console.log('Analyzing chapter structure...');
  
  // Extract only Matthew (pages 3108-3183)
  console.log('\n=== Extracting Matthew only (pages 3108-3183) ===');
  let extractedChapters: Map<string, string>;
  
  try {
    extractedChapters = await extractChaptersByPageRanges(parser, fullText);
    if (extractedChapters.size === 0) {
      console.log('Page-range extraction returned no results, trying text-based...');
      const matthewBook = NEW_TESTAMENT_BOOKS.find(b => b.book === 'Matthew');
      if (matthewBook) {
        extractedChapters = extractChaptersFromBookText(fullText, matthewBook);
      }
    }
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
    const matthewBook = NEW_TESTAMENT_BOOKS.find(b => b.book === 'Matthew');
    if (matthewBook) {
      extractedChapters = extractChaptersFromBookText(fullText, matthewBook);
    } else {
      extractedChapters = new Map();
    }
  }
  
  console.log(`\nExtracted ${extractedChapters.size} Matthew chapters`);
  
  // Get only Matthew chapters from database
  const existingChapters = await prisma.chapter.findMany({
    where: { book: 'Matthew' },
    orderBy: { chapterNumber: 'asc' }
  });
  
  console.log(`Found ${existingChapters.length} Matthew chapters in database`);
  
  // Update only Matthew chapters
  let updated = 0;
  let notFound = 0;
  const notFoundChapters: string[] = [];
  
  for (const chapter of existingChapters) {
    const key = `${chapter.book}_${chapter.chapterNumber}`;
    const extractedContent = extractedChapters.get(key);
    
    if (extractedContent) {
      await prisma.chapter.update({
        where: { id: chapter.id },
        data: { content: extractedContent }
      });
      updated++;
      console.log(`  Updated ${chapter.book} ${chapter.chapterNumber} (${extractedContent.length} chars)`);
    } else {
      notFound++;
      notFoundChapters.push(`${chapter.book} ${chapter.chapterNumber}`);
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Successfully updated: ${updated} chapters`);
  console.log(`Not found in PDF: ${notFound} chapters`);
  
  if (notFoundChapters.length > 0) {
    console.log('\nChapters not found:');
    notFoundChapters.slice(0, 20).forEach(ch => console.log(`  - ${ch}`));
    if (notFoundChapters.length > 20) {
      console.log(`  ... and ${notFoundChapters.length - 20} more`);
    }
  }
  
  console.log('\nImport complete!');
}

main()
  .catch((error) => {
    console.error('Error during import:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
