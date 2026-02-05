import { useState, useEffect, useRef } from "react";
import infoIcon from "../assets/info-i-25.svg";

type Props = {
  version: string | null;
};

export const InfoButton = ({ version }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const popupWidth = 280;

    let left = rect.left + (rect.width / 2) - (popupWidth / 2);
    if (left < 10) left = 10;
    if (left + popupWidth > viewportWidth - 10) {
      left = viewportWidth - popupWidth - 10;
    }

    const top = rect.bottom + 8;

    setPosition({ top, left });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        className="info-button"
        onClick={handleClick}
        type="button"
        aria-label="Info"
      >
        <img src={infoIcon} alt="Info" className="info-button-icon" />
      </button>
      {isOpen && position && (
        <div
          ref={popupRef}
          className="info-popup"
          style={{
            position: "fixed",
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 1000,
          }}
        >
          <div className="info-popup-content">
            {version && (
              <p className="info-popup-version">Version {version}</p>
            )}
            <p className="info-popup-credits">
              Developed by Christ&apos;s silliest goose Anton Starodub
            </p>
            <p className="info-popup-contact">
              Get in touch:{" "}
              <a href="mailto:anton.starodub@protonmail.com">
                anton.starodub@protonmail.com
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
};
