// Every limit and default for the PDF Utilities (Compressor / Splitter /
// Merger) lives here, mirroring src/lib/pdf-study/config.ts's pattern —
// one file to tune caps in, instead of scattering them through routes and
// UI. Anything the server enforces is duplicated to the client only for
// *display*; the server never trusts a client-sent limit (see validate.ts).

// ---------------------------------------------------------------------------
// Upload limits
// ---------------------------------------------------------------------------

export const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB per file
export const MAX_PDF_PAGES = 500; // no AI generation cost here, just memory

// Merger-specific: bound how much a single request can ask the Node
// function to hold in memory at once.
export const MAX_MERGE_FILES = 20;
export const MAX_MERGE_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB combined

// Splitter "split every page" — a hard ceiling so a pathological page count
// can't fan out into an unbounded number of zip entries.
export const MAX_SPLIT_OUTPUT_FILES = 500;

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

export type CompressionLevel = "low" | "recommended" | "high";

export interface CompressionPreset {
  label: string;
  helpText: string;
  jpegQuality: number; // 1-100, passed to sharp
  maxDimensionPx: number; // longest edge; images are only ever downsized
}

export const COMPRESSION_PRESETS: Record<CompressionLevel, CompressionPreset> = {
  low: {
    label: "Low",
    helpText: "Better quality, larger file",
    jpegQuality: 82,
    maxDimensionPx: 2200,
  },
  recommended: {
    label: "Recommended",
    helpText: "Balanced quality and file size",
    jpegQuality: 62,
    maxDimensionPx: 1600,
  },
  high: {
    label: "High",
    helpText: "Smaller file, lower quality",
    jpegQuality: 40,
    maxDimensionPx: 1200,
  },
};

export const DEFAULT_COMPRESSION_LEVEL: CompressionLevel = "recommended";

// Advanced overrides — only expose controls for what the backend actually
// supports (see compressor.ts). Bounds are server-enforced.
export const MIN_IMAGE_QUALITY = 10;
export const MAX_IMAGE_QUALITY = 95;
export const MIN_MAX_DIMENSION = 400;
export const MAX_MAX_DIMENSION = 4000;

// Above this page count, rendering a thumbnail per page client-side would be
// slow enough to hurt the "fast" principle — the splitter falls back to a
// plain page-number/range picker without thumbnails instead.
export const MAX_PAGES_FOR_THUMBNAILS = 60;

// If the processed file isn't at least this much smaller than the original,
// we treat it as "already optimized" and hand back the original instead of
// a technically-different-but-not-actually-smaller "compressed" file.
export const MIN_MEANINGFUL_REDUCTION_RATIO = 0.03; // 3%

// ---------------------------------------------------------------------------
// Cost / abuse protection — daily per-identity caps, enforced server-side
// ---------------------------------------------------------------------------

export const MAX_ANONYMOUS_OPERATIONS_PER_DAY = 15;
export const MAX_AUTH_OPERATIONS_PER_DAY = 60;

// ---------------------------------------------------------------------------
// "→ PDF" tools (Image/HTML/Word to PDF) — all client-side, same principle
// as PDF → Image: nothing here is ever uploaded, so these limits exist only
// to keep a single browser tab from choking on a pathological input, not to
// protect a server.
// ---------------------------------------------------------------------------

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB per image
export const MAX_IMAGES_PER_PDF = 40;

export const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5 MB source HTML
export const MAX_DOCX_BYTES = 20 * 1024 * 1024; // 20 MB .docx

// A4 at 96 CSS px/inch, used by the HTML/Word → PDF renderer to size the
// hidden rendering frame consistently regardless of the viewer's own window.
export const HTML_TO_PDF_FRAME_WIDTH_PX = 794; // 210mm
export const HTML_TO_PDF_PAGE_WIDTH_MM = 210;
export const HTML_TO_PDF_PAGE_HEIGHT_MM = 297;
