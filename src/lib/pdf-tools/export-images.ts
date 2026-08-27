"use client";

// PDF → JPG/PNG/WEBP — same principle as thumbnails.ts: pdf.js renders each
// page to an off-DOM <canvas> entirely in the browser, then canvas.toBlob()
// encodes it to the target raster format. Nothing is ever uploaded — this is
// the same "runs entirely client-side" pattern as png-to-webp, just fed by a
// PDF page instead of an existing image.
//
// This deliberately does NOT go through the api/pdf/* route layer or
// PdfService — there's no server-side operation to perform, so adding one
// would just be a slower, less private version of what the browser can
// already do natively.

import { loadPdfjs } from "./thumbnails";
import { withTimeout } from "./with-timeout";

export type ImageExportFormat = "jpg" | "png" | "webp";

export interface ImageExportResolution {
  label: string;
  helpText: string;
  dpi: number;
}

// 72 DPI is a PDF "point" — pdf.js viewport scale is relative to that, so
// scale = targetDpi / 72.
export const IMAGE_EXPORT_RESOLUTIONS: Record<"standard" | "high", ImageExportResolution> = {
  standard: { label: "Standard", helpText: "150 DPI — good for screens and documents", dpi: 150 },
  high: { label: "High", helpText: "300 DPI — sharper, larger files", dpi: 300 },
};

const MIME_BY_FORMAT: Record<ImageExportFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function extensionFor(format: ImageExportFormat): string {
  return format === "jpg" ? "jpg" : format;
}

export interface RenderedPageImage {
  pageNumber: number;
  blob: Blob;
  /** true if the browser couldn't encode the requested format and silently
   *  fell back to PNG (a real, documented canvas.toBlob behavior — Safari
   *  in particular doesn't support encoding WEBP). Surfaced so the UI can
   *  be honest about it instead of mislabeling a PNG as a .webp file. */
  fellBackToPng: boolean;
}

interface PdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getViewport(opts: { scale: number }): { width: number; height: number };
    render(opts: { canvas: HTMLCanvasElement; canvasContext: CanvasRenderingContext2D; viewport: unknown }): {
      promise: Promise<void>;
    };
  }>;
  destroy(): Promise<void>;
}

export async function openPdfForExport(file: File): Promise<PdfDocumentLike> {
  const pdfjsLib = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  return pdf as unknown as PdfDocumentLike;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      mime,
      quality
    );
  });
}

// A page render should take well under a second in the overwhelming
// majority of real cases. This is a safety net, not a tuning knob: if
// pdf.js's render pipeline ever stalls on a pathological page (a corrupt
// content stream, a worker that stops responding), the user gets a clear
// error instead of "Please don't close this page" forever — see spec's
// "avoid freezing the UI" / never-hang requirement.
const RENDER_TIMEOUT_MS = 20_000;

export async function renderPageToImage(
  pdf: PdfDocumentLike,
  pageNumber: number,
  format: ImageExportFormat,
  dpi: number,
  quality = 0.9
): Promise<RenderedPageImage> {
  const page = await pdf.getPage(pageNumber);
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  // PDF pages are opaque white by default; JPG has no alpha channel, so
  // paint a white background first or transparent PDF regions would
  // otherwise render black once encoded to JPEG.
  if (format === "jpg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  await withTimeout(
    page.render({ canvas, canvasContext: ctx, viewport }).promise,
    RENDER_TIMEOUT_MS,
    "Rendering this page timed out."
  );

  const mime = MIME_BY_FORMAT[format];
  const blob = await canvasToBlob(canvas, mime, quality);
  // canvas.toBlob silently falls back to image/png if the browser can't
  // encode the requested type (most commonly WEBP on older Safari).
  const fellBackToPng = format !== "png" && blob.type === "image/png";

  return { pageNumber, blob, fellBackToPng };
}
