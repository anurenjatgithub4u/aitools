// Shared, server-side-trusted validation for every PDF Utility. Client-side
// checks (in PdfUpload) are a courtesy so an obviously bad file doesn't cost
// an upload — this is the real gate. Never trust the client alone (spec §22).

import { PDFDocument, EncryptedPDFError } from "pdf-lib";
import { MAX_PDF_BYTES, MAX_PDF_PAGES } from "./config";
import { PdfToolError } from "./types";

export interface ValidatedPdf {
  doc: PDFDocument;
  bytes: Uint8Array;
  pageCount: number;
}

/** Extension + MIME sniff — cheap, catches the obviously-wrong-file case fast. */
export function assertPdfShapedUpload(file: File): void {
  const isPdfType = file.type === "application/pdf" || file.type === "application/x-pdf";
  const isPdfName = file.name.toLowerCase().endsWith(".pdf");
  if (!isPdfType && !isPdfName) {
    throw new PdfToolError("invalid_file", "This file is not a valid PDF.");
  }
  if (file.size === 0) {
    throw new PdfToolError("empty_file", "This file appears to be empty.");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new PdfToolError(
      "too_large",
      `This file exceeds the maximum supported size (${Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB).`,
      413
    );
  }
}

/**
 * Loads and structurally validates a PDF. Throws a PdfToolError with copy
 * that matches spec §19/§28 exactly — corrupted, encrypted, and empty PDFs
 * each get their own message rather than a generic failure.
 */
export async function loadAndValidatePdf(bytes: Uint8Array, opts?: { maxPages?: number }): Promise<ValidatedPdf> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: false });
  } catch (e) {
    if (e instanceof EncryptedPDFError) {
      throw new PdfToolError(
        "encrypted",
        "This PDF is password protected. Please unlock it before processing."
      );
    }
    throw new PdfToolError("corrupted", "This file is not a valid PDF.");
  }

  const pageCount = doc.getPageCount();
  if (pageCount === 0) {
    throw new PdfToolError("empty_file", "This PDF has no pages.");
  }
  const maxPages = opts?.maxPages ?? MAX_PDF_PAGES;
  if (pageCount > maxPages) {
    throw new PdfToolError(
      "too_many_pages",
      `This PDF has too many pages. The limit is ${maxPages} pages.`,
      413
    );
  }

  return { doc, bytes, pageCount };
}

export async function fileToBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}
