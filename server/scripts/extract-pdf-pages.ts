/**
 * Extract pages 3076-3943 from study-bible.pdf into a new PDF file.
 * These pages contain the New Testament in the study bible.
 *
 * Uses qpdf (install with: brew install qpdf). pdf-lib hits stack overflow
 * on this large PDF due to complex nested structures.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const BOOK_DIR = path.join(__dirname, "../book");
const SOURCE_PDF = path.join(BOOK_DIR, "study-bible.pdf");
const OUTPUT_PDF = path.join(BOOK_DIR, "study-bible-nt.pdf");

const START_PAGE = 3076; // 1-based
const END_PAGE = 3943;   // 1-based

function main() {
  if (!fs.existsSync(SOURCE_PDF)) {
    throw new Error(`Source PDF not found: ${SOURCE_PDF}`);
  }

  console.log(`Extracting pages ${START_PAGE}-${END_PAGE} from study-bible.pdf...`);

  try {
    execSync(
      `qpdf --empty --pages "${SOURCE_PDF}" ${START_PAGE}-${END_PAGE} -- "${OUTPUT_PDF}"`,
      { stdio: "inherit" }
    );
    const pageCount = END_PAGE - START_PAGE + 1;
    console.log(`Done! Wrote ${OUTPUT_PDF} (${pageCount} pages)`);
  } catch (err) {
    const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : null;
    if (status === 127 || (err instanceof Error && err.message?.includes("qpdf"))) {
      console.error("\nqpdf is not installed. Install it with:");
      console.error("  brew install qpdf");
      console.error("\nThen run: npm run extract:pdf");
      process.exit(1);
    }
    throw err;
  }
}

main();
