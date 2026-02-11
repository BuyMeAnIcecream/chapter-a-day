#!/usr/bin/env python3
"""
Local GUI to manually enter/edit NKJV chapter content.
Saves to server/book/nkjv-chapters.json. No DB connection.
"""
import json
import os
import re
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox

# Same book list as server/prisma/seed.ts
NEW_TESTAMENT_BOOKS = [
    ("Matthew", 28),
    ("Mark", 16),
    ("Luke", 24),
    ("John", 21),
    ("Acts", 28),
    ("Romans", 16),
    ("1 Corinthians", 16),
    ("2 Corinthians", 13),
    ("Galatians", 6),
    ("Ephesians", 6),
    ("Philippians", 4),
    ("Colossians", 4),
    ("1 Thessalonians", 5),
    ("2 Thessalonians", 3),
    ("1 Timothy", 6),
    ("2 Timothy", 4),
    ("Titus", 3),
    ("Philemon", 1),
    ("Hebrews", 13),
    ("James", 5),
    ("1 Peter", 5),
    ("2 Peter", 3),
    ("1 John", 5),
    ("2 John", 1),
    ("3 John", 1),
    ("Jude", 1),
    ("Revelation", 22),
]


def build_chapter_list():
    """List of 'Book N' in order (260 chapters)."""
    out = []
    for book, num_chapters in NEW_TESTAMENT_BOOKS:
        for n in range(1, num_chapters + 1):
            out.append(f"{book} {n}")
    return out


def display_to_key(display: str) -> str:
    """'Matthew 1' -> 'Matthew_1', '1 Corinthians 3' -> '1 Corinthians_3'."""
    last_space = display.rfind(" ")
    if last_space == -1:
        return display
    book = display[:last_space]
    num = display[last_space + 1 :]
    return f"{book}_{num}"


def get_json_path() -> str:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, "..", "server", "book", "nkjv-chapters.json")


def load_data(path: str) -> dict:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_data(path: str, data: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def fix_line_breaks(content: str) -> str:
    """
    Join lines that were broken by PDF copy. Keeps:
    - New verses (next line starts with digits) as separate lines.
    - Paragraph breaks (blank lines) as-is.
    Joins when the current line doesn't end with . ? ! : and the next
    line is a continuation (doesn't start with a verse number).
    """
    lines = content.split("\n")
    result_lines = []
    buffer = None

    def should_join(prev: str, next_line: str) -> bool:
        if not next_line.strip():
            return False
        if prev.rstrip().endswith((".", "?", "!", ":")):
            return False
        stripped = next_line.lstrip()
        if not stripped:
            return False
        if stripped[0].isdigit():
            return False
        return True

    for line in lines:
        if line.strip() == "":
            if buffer is not None:
                result_lines.append(buffer)
                result_lines.append("")
                buffer = None
        else:
            if buffer is None:
                buffer = line
            else:
                if should_join(buffer, line):
                    buffer = buffer + " " + line
                else:
                    result_lines.append(buffer)
                    buffer = line
    if buffer is not None:
        result_lines.append(buffer)
    return "\n".join(result_lines)


def normalize_verses(content: str) -> str:
    """
    Ensure every verse starts on a new line and has a space after the verse number.
    - After . ? ! : put a newline before the next verse number.
    - Insert space between verse number and following letter (e.g. "1The" -> "1 The").
    """
    # Newline before verse number when it follows sentence-ending punctuation
    content = re.sub(r"([.?!:])\s*(\d+)", r"\1\n\2", content)
    # Space between verse number and following letter (same line)
    content = re.sub(r"(\d+)([a-zA-Z])", r"\1 \2", content)
    return content


def main():
    json_path = get_json_path()
    data = load_data(json_path)
    chapters = build_chapter_list()

    root = tk.Tk()
    root.title("NKJV Chapter Editor")
    root.geometry("800x600")

    # Current selection (display name)
    current_display = tk.StringVar(value=chapters[0] if chapters else "")

    # Top: dropdown
    top = ttk.Frame(root, padding=8)
    top.pack(fill=tk.X)
    ttk.Label(top, text="Chapter:").pack(side=tk.LEFT, padx=(0, 8))
    combo = ttk.Combobox(
        top,
        textvariable=current_display,
        values=chapters,
        state="readonly",
        width=30,
    )
    combo.pack(side=tk.LEFT, fill=tk.X, expand=True)

    # Symbols to remove
    remove_frame = ttk.Frame(root, padding=8)
    remove_frame.pack(fill=tk.X)
    ttk.Label(remove_frame, text="Remove symbols (press Enter):").pack(side=tk.LEFT, padx=(0, 8))
    symbols_entry = ttk.Entry(remove_frame, width=40)
    symbols_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

    def on_remove_symbols(event=None):
        chars = symbols_entry.get()
        if not chars:
            return
        content = text.get("1.0", tk.END)
        for c in chars:
            content = content.replace(c, "")
        text.delete("1.0", tk.END)
        text.insert("1.0", content)

    symbols_entry.bind("<Return>", on_remove_symbols)

    # Text area
    text_frame = ttk.Frame(root, padding=8)
    text_frame.pack(fill=tk.BOTH, expand=True)
    text = scrolledtext.ScrolledText(text_frame, wrap=tk.WORD, font=("TkDefaultFont", 11))
    text.pack(fill=tk.BOTH, expand=True)

    def on_chapter_change(*args):
        display = current_display.get()
        key = display_to_key(display)
        content = data.get(key, "")
        text.delete("1.0", tk.END)
        text.insert("1.0", content)

    current_display.trace_add("write", on_chapter_change)

    def on_save():
        display = current_display.get()
        key = display_to_key(display)
        content = text.get("1.0", tk.END)
        if content.endswith("\n"):
            content = content[:-1]
        data[key] = content
        save_data(json_path, data)
        messagebox.showinfo("Saved", f"Saved {display} to {json_path}")

    def on_fix_line_breaks():
        content = text.get("1.0", tk.END)
        if content.endswith("\n"):
            content = content[:-1]
        fixed = fix_line_breaks(content)
        text.delete("1.0", tk.END)
        text.insert("1.0", fixed)
        messagebox.showinfo("Done", "Line breaks fixed. Use Save to persist.")

    def on_normalize_verses():
        content = text.get("1.0", tk.END)
        if content.endswith("\n"):
            content = content[:-1]
        fixed = normalize_verses(content)
        text.delete("1.0", tk.END)
        text.insert("1.0", fixed)
        messagebox.showinfo("Done", "Verses normalized (one per line, space after number). Use Save to persist.")

    # Initial load
    on_chapter_change()

    # Buttons
    btn_frame = ttk.Frame(root, padding=8)
    btn_frame.pack(fill=tk.X)
    ttk.Button(btn_frame, text="Save", command=on_save).pack(side=tk.LEFT, padx=(0, 8))
    ttk.Button(btn_frame, text="Fix line breaks", command=on_fix_line_breaks).pack(side=tk.LEFT, padx=(0, 8))
    ttk.Button(btn_frame, text="Normalize verses", command=on_normalize_verses).pack(side=tk.LEFT)

    root.mainloop()


if __name__ == "__main__":
    main()
