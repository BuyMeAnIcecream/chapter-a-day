import { VerseReference } from "./VerseReference";
import { splitCommentContent, getVerseText } from "../utils/verseUtils";

type Props = {
  content: string;
  chapterContent: string;
  book: string;
  chapterNumber: number;
};

export const CommentContent = ({ content, chapterContent, book, chapterNumber }: Props) => {
  const segments = splitCommentContent(content);
  
  return (
    <>
      {segments.map((segment, index) => {
        if (typeof segment === 'string') {
          return <span key={index}>{segment}</span>;
        } else {
          const verseText = getVerseText(chapterContent, segment.verse);
          return (
            <VerseReference
              key={index}
              verseNumber={segment.verse}
              verseText={verseText}
              book={book}
              chapterNumber={chapterNumber}
            />
          );
        }
      })}
    </>
  );
};
