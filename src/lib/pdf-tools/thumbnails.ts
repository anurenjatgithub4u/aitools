"use client";

// Client-side page thumbnail rendering for the Splitter, via pdf.js. This
// never uploads the file anywhere — rendering happens entirely in the
// browser, so a user can see and pick pages before any data leaves their
// device (only the final split operation uploads the file).

import { withTimeout } from "./with-timeout";

export interface PageThumbnail {
  pageNumber: number;
  dataUrl: string;
}

// See with-timeout.ts — a stuck render should never hang the UI forever.
const THUMBNAIL_RENDER_TIMEOUT_MS = 20_000;

let workerConfigured = false;

// Exported so export-images.ts (PDF → JPG/PNG/WEBP) can reuse the exact same
// worker setup instead of configuring pdf.js a second time.
export async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    workerConfigured = true;
  }
  return pdfjsLib;
}

/** Just the page count — used to decide whether thumbnails are worth generating. */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjsLib = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const count = pdf.numPages;
  await pdf.destroy();
  return count;
}

export async function renderPageThumbnails(
  file: File,
  onPage?: (thumb: PageThumbnail) => void
): Promise<PageThumbnail[]> {
  const pdfjsLib = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const thumbnails: PageThumbnail[] = [];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    await pdf.destroy();
    return thumbnails;
  }

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.35 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    try {
      await withTimeout(
        page.render({ canvas, canvasContext: ctx, viewport }).promise,
        THUMBNAIL_RENDER_TIMEOUT_MS,
        "Rendering this page timed out."
      );
    } catch {
      // A single stuck/failed page shouldn't take down the whole preview —
      // skip it and let the rest of the pages still render. The page
      // number picker still works from pageCount even without a thumbnail.
      continue;
    }
    const thumb: PageThumbnail = { pageNumber, dataUrl: canvas.toDataURL("image/jpeg", 0.6) };
    thumbnails.push(thumb);
    onPage?.(thumb);
  }

  await pdf.destroy();
  return thumbnails;
}
