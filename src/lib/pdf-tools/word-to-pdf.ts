"use client";

// Word (.docx) → PDF: mammoth converts the document to semantic HTML
// (headings, paragraphs, lists, tables, inline images) entirely in the
// browser — mammoth ships a browser build specifically for this — and the
// result is rendered to a PDF through the same renderHtmlStringToPdf core
// the HTML to PDF tool uses.
//
// Honest limitation, matching mammoth's own design goal: this preserves your
// document's *content and structure*, not its exact original layout — page
// breaks, precise fonts, and pixel-perfect spacing from the source .docx
// aren't reproduced. For visually-faithful output, "Print to PDF" from
// Word/Google Docs is still the right tool; this is for turning a document
// into a shareable PDF quickly.

import mammoth from "mammoth";
import { renderHtmlStringToPdf, type HtmlToPdfResult } from "./html-to-pdf";

const DOCUMENT_STYLES = `
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.5; padding: 32px 40px; }
  h1, h2, h3 { font-family: Arial, Helvetica, sans-serif; color: #111; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  h2 { font-size: 18px; margin: 20px 0 8px; }
  h3 { font-size: 15px; margin: 16px 0 6px; }
  p { font-size: 13px; margin: 0 0 10px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  td, th { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
  img { max-width: 100%; }
  ul, ol { margin: 0 0 10px; padding-left: 24px; font-size: 13px; }
`;

export async function convertDocxToPdf(file: File): Promise<HtmlToPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: bodyHtml, messages } = await mammoth.convertToHtml({ arrayBuffer });

  // mammoth reports unsupported-element warnings via `messages` rather than
  // throwing — a doc with zero extractable content (e.g. all images/shapes,
  // no text) is the one case worth surfacing as a real error.
  if (!bodyHtml || bodyHtml.trim().length === 0) {
    throw new Error(
      "We couldn't find any convertible content in this document" +
        (messages.length ? " — it may only contain unsupported elements." : ".")
    );
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${DOCUMENT_STYLES}</style></head><body>${bodyHtml}</body></html>`;
  return renderHtmlStringToPdf(html);
}
