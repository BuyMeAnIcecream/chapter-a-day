import { useState, useRef, useEffect } from "react";

type Props = {
  verseNumber: number;
  verseText: string | null;
  book: string;
  chapterNumber: number;
};

export const VerseReference = ({ verseNumber, verseText, book, chapterNumber }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const tooltipHeight = 200; // Estimated tooltip height
    const tooltipWidth = 300; // Estimated tooltip width
    
    // Determine if tooltip should be above or below
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement = spaceBelow >= tooltipHeight || spaceBelow > spaceAbove ? 'below' : 'above';
    
    // Calculate horizontal position (center on button, but keep within viewport)
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    if (left < 10) left = 10;
    if (left + tooltipWidth > viewportWidth - 10) {
      left = viewportWidth - tooltipWidth - 10;
    }
    
    // Calculate vertical position
    const top = placement === 'below' 
      ? rect.bottom + 8 
      : rect.top - tooltipHeight - 8;
    
    setPosition({ top, left, placement });
    setIsOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const displayText = verseText || `Verse ${verseNumber} not found`;

  return (
    <>
      <button
        ref={buttonRef}
        className="verse-reference"
        onClick={handleClick}
        type="button"
      >
        #{verseNumber}
      </button>
      {isOpen && position && (
        <div
          ref={tooltipRef}
          className="verse-tooltip"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 1000
          }}
        >
          <div className="verse-tooltip-content">
            <div className="verse-tooltip-header">
              <button
                className="verse-tooltip-close"
                onClick={() => setIsOpen(false)}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
              <strong>{book} {chapterNumber}:{verseNumber}</strong>
            </div>
            <div className="verse-tooltip-text">
              {displayText}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
