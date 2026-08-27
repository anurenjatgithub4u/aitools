// Server-only, page-aware PDF text extraction. pdf-parse is Node-only (it
// pulls in pdfjs-dist), so this must never be imported from a client
// component — only from the API route.
//
// Unlike the resume extractor this keeps page boundaries intact, because
// source-page references in the generated study material are only honest if
// we actually know which page a passage came from.

import { PDFParse } from "pdf-parse";
import {
  MAX_EXTRACTED_CHARS,
  MAX_PDF_PAGES,
  MIN_EXTRACTABLE_CHARS,
} from "./config";
import type { PdfPage } from "./types";

export class PdfExtractionError extends Error {
  // Distinguishes "the user needs to do something about this file" from a
  // genuine server fault, so the route can pick the right status code.
  readonly userFacing = true;
  constructor(message: string) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

function cleanPageText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    // Non-breaking spaces and form feeds are common in PDF text layers and
    // would otherwise survive the whitespace collapse below.
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\f\u0000]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface ExtractionOutcome {
  pages: PdfPage[];
  pageCount: number;
  charCount: number;
  hasExtractableText: boolean;
  pageMappingReliable: boolean;
}

export async function extractPdfPages(file: File): Promise<ExtractionOutcome> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // A valid PDF starts with "%PDF-". Checking here gives a clean error for a
  // renamed or truncated file instead of a parser stack trace.
  const header = new TextDecoder().decode(buffer.slice(0, 5));
  if (header !== "%PDF-") {
    throw new PdfExtractionError("We couldn't read this PDF. Please try another PDF.");
  }

  const parser = new PDFParse({ data: buffer });
  let pages: PdfPage[];
  let pageCount: number;

  try {
    const result = await parser.getText();
    pageCount = result.total ?? result.pages?.length ?? 0;

    if (!pageCount) {
      throw new PdfExtractionError("We couldn't read this PDF. Please try another PDF.");
    }
    // Checked after parsing because the page count isn't knowable until the
    // document is open. Rejecting outright — never silently truncating — so
    // the user knows exactly why the file didn't go through.
    if (pageCount > MAX_PDF_PAGES) {
      throw new PdfExtractionError(
        `This PDF has too many pages. Please upload a PDF with ${MAX_PDF_PAGES} pages or fewer.`
      );
    }

    pages = (result.pages ?? [])
      .map((p) => ({ page: p.num, text: cleanPageText(p.text || "") }))
      .filter((p) => Number.isFinite(p.page) && p.page > 0);
  } catch (e) {
    if (e instanceof PdfExtractionError) throw e;
    throw new PdfExtractionError("We couldn't read this PDF. Please try another PDF.");
  } finally {
    // Releases the pdfjs worker. Skipping this leaks a worker per upload.
    await parser.destroy().catch(() => {});
  }

  // Page mapping is only trustworthy when the parser gave us a text entry per
  // page. If pages came back collapsed or partial we still generate material,
  // but the UI suppresses page references rather than inventing them.
  const pageMappingReliable = pages.length === pageCount && pages.length > 0;

  const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
  const hasExtractableText = totalChars >= MIN_EXTRACTABLE_CHARS;

  return {
    pages: capTotalChars(pages),
    pageCount,
    charCount: totalChars,
    hasExtractableText,
    pageMappingReliable,
  };
}

// Trims the extracted text to a total ceiling, dropping from the end so the
// earlier (usually more foundational) pages survive. Pages that get fully
// trimmed are dropped rather than left as empty entries.
function capTotalChars(pages: PdfPage[]): PdfPage[] {
  let budget = MAX_EXTRACTED_CHARS;
  const out: PdfPage[] = [];
  for (const page of pages) {
    if (budget <= 0) break;
    if (page.text.length <= budget) {
      out.push(page);
      budget -= page.text.length;
    } else {
      out.push({ page: page.page, text: page.text.slice(0, budget) });
      budget = 0;
    }
  }
  return out;
}
