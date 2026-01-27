/**
 * Extract verse text from chapter content by verse number
 * Chapter content format: "1 Text\n2 Text\n3 Text..."
 * 
 * @param content - The full chapter content
 * @param verseNumber - The verse number to extract
 * @returns The verse text (including verse number) or null if not found
 */
export function getVerseText(content: string, verseNumber: number): string | null {
  if (!content) return null;
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Match lines starting with verse number: "4 Text..." or "4\tText..."
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const verseNum = parseInt(match[1], 10);
      const verseText = match[2].trim();
      
      if (verseNum === verseNumber) {
        return `${verseNumber} ${verseText}`;
      }
    }
  }
  
  return null;
}

/**
 * Parse comment text for verse references using #number syntax
 * 
 * @param text - The comment text to parse
 * @returns Array of verse reference objects with verse number and positions
 */
export function parseVerseReferences(text: string): Array<{verse: number, start: number, end: number}> {
  const references: Array<{verse: number, start: number, end: number}> = [];
  const regex = /#(\d+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    references.push({
      verse: parseInt(match[1], 10),
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return references;
}

/**
 * Split comment text into segments (text and verse references)
 * 
 * @param text - The comment text
 * @returns Array of segments, each is either a text string or a verse reference object
 */
export function splitCommentContent(text: string): Array<string | {verse: number, text: string}> {
  const references = parseVerseReferences(text);
  
  if (references.length === 0) {
    return [text];
  }
  
  const segments: Array<string | {verse: number, text: string}> = [];
  let lastIndex = 0;
  
  for (const ref of references) {
    // Add text before this reference
    if (ref.start > lastIndex) {
      const textSegment = text.substring(lastIndex, ref.start);
      if (textSegment) {
        segments.push(textSegment);
      }
    }
    
    // Add the verse reference
    segments.push({
      verse: ref.verse,
      text: text.substring(ref.start, ref.end)
    });
    
    lastIndex = ref.end;
  }
  
  // Add remaining text after last reference
  if (lastIndex < text.length) {
    const textSegment = text.substring(lastIndex);
    if (textSegment) {
      segments.push(textSegment);
    }
  }
  
  return segments;
}
