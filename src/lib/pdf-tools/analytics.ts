// Analytics event hook for the PDF Utilities. No analytics SDK exists
// elsewhere in this codebase yet, so this is a neutral passthrough: it logs
// in development and forwards to `window.gtag` / `window.dataLayer` if a
// tag manager is ever wired up on the page, without requiring one now. Only
// ever call this with the whitelisted fields below — never PDF content or
// filenames (spec §27).

export type PdfAnalyticsEvent =
  | "pdf_tool_opened"
  | "pdf_upload_started"
  | "pdf_upload_completed"
  | "pdf_processing_started"
  | "pdf_processing_completed"
  | "pdf_processing_failed"
  | "pdf_downloaded";

export interface PdfAnalyticsPayload {
  tool_name:
    | "pdf_compressor"
    | "pdf_splitter"
    | "pdf_merger"
    | "pdf_to_image"
    | "image_to_pdf"
    | "html_to_pdf"
    | "word_to_pdf"
    | "pdf_page_numbers"
    | "pdf_rotator"
    | "pdf_protect";
  file_size?: number;
  page_count?: number;
  compression_level?: string;
  processing_time?: number;
  [key: string]: string | number | undefined;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackPdfEvent(event: PdfAnalyticsEvent, payload: PdfAnalyticsPayload): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV !== "production") {
    console.debug("[pdf-analytics]", event, payload);
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", event, payload);
  } else if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...payload });
  }
}
