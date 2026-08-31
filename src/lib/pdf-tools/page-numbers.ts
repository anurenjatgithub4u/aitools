// Client-side page numbering — runs entirely in the browser; nothing is uploaded.
// Uses pdf-lib (already a project dependency) to embed text annotations on each page.

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type PageNumberPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export interface PageNumberOptions {
  /** Where on the page to stamp the number */
  position: PageNumberPosition;
  /** Starting page number (default 1) */
  startNumber: number;
  /** Font size in pt (default 11) */
  fontSize: number;
  /** Format: "1", "Page 1", "Page 1 of N", "1 / N" */
  format: "number" | "page-n" | "page-n-of-total" | "n-of-total";
  /** Margin from edge in pt (default 28) */
  margin: number;
}

export interface PageNumberResult {
  blob: Blob;
  pageCount: number;
}

export async function addPageNumbers(
  fileBytes: Uint8Array,
  opts: PageNumberOptions
): Promise<PageNumberResult> {
  const { position, startNumber, fontSize, format, margin } = opts;

  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: false });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNumber = startNumber + i;

    let label: string;
    switch (format) {
      case "page-n":
        label = `Page ${pageNumber}`;
        break;
      case "page-n-of-total":
        label = `Page ${pageNumber} of ${startNumber + totalPages - 1}`;
        break;
      case "n-of-total":
        label = `${pageNumber} / ${startNumber + totalPages - 1}`;
        break;
      default:
        label = String(pageNumber);
    }

    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    // Compute x based on horizontal alignment
    let x: number;
    const [vAlign, hAlign] = position.split("-") as ["top" | "bottom", "left" | "center" | "right"];
    switch (hAlign) {
      case "center":
        x = (width - textWidth) / 2;
        break;
      case "right":
        x = width - margin - textWidth;
        break;
      default: // left
        x = margin;
    }

    // Compute y based on vertical alignment
    let y: number;
    if (vAlign === "top") {
      y = height - margin - textHeight;
    } else {
      y = margin;
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
      opacity: 0.85,
    });
  }

  const resultBytes = await pdfDoc.save();
  return {
    blob: new Blob([resultBytes.buffer as ArrayBuffer], { type: "application/pdf" }),
    pageCount: totalPages,
  };
}
