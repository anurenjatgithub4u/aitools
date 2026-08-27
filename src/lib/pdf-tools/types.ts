// Shared types for the PDF Utilities feature — used by both the lib layer
// (server) and the components (client), so the two never drift apart.

import type { CompressionLevel } from "./config";

export interface PdfMeta {
  fileName: string;
  byteSize: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Shared client-side processing state machine (idle → uploading → ready →
// processing → success/error), per the spec's §4.
// ---------------------------------------------------------------------------

export type ProcessingState =
  | "idle"
  | "uploading"
  | "ready"
  | "processing"
  | "success"
  | "error";

// ---------------------------------------------------------------------------
// Compressor
// ---------------------------------------------------------------------------

export interface CompressAdvancedOptions {
  imageQuality?: number; // overrides the level preset's jpegQuality
  imageResolution?: number; // overrides the level preset's maxDimensionPx
  grayscale?: boolean;
  removeMetadata?: boolean;
}

export interface CompressRequestOptions {
  level: CompressionLevel;
  advanced?: CompressAdvancedOptions;
}

export interface CompressResultMeta {
  originalBytes: number;
  resultBytes: number;
  pageCount: number;
  alreadyOptimized: boolean;
  imagesRecompressed: number;
}

// ---------------------------------------------------------------------------
// Splitter
// ---------------------------------------------------------------------------

export type SplitMode = "extract" | "every" | "ranges";

export interface PageRange {
  start: number;
  end: number;
}

export interface SplitRequestOptions {
  mode: SplitMode;
  pages?: number[]; // 1-based, for "extract"
  ranges?: PageRange[]; // 1-based inclusive, for "ranges"
}

export interface SplitResultMeta {
  pageCount: number;
  outputFileCount: number;
  isZip: boolean;
}

// ---------------------------------------------------------------------------
// Merger
// ---------------------------------------------------------------------------

export interface MergeRequestOptions {
  addBookmarks?: boolean;
  preserveMetadata?: boolean;
}

export interface MergeResultMeta {
  fileCount: number;
  pageCount: number;
  resultBytes: number;
}

// ---------------------------------------------------------------------------
// Errors — a fixed vocabulary so the UI can show the exact copy the spec
// requires instead of a generic "Something went wrong."
// ---------------------------------------------------------------------------

export type PdfToolErrorCode =
  | "invalid_file"
  | "too_large"
  | "empty_file"
  | "encrypted"
  | "corrupted"
  | "too_many_pages"
  | "invalid_range"
  | "rate_limited"
  | "server_error";

export class PdfToolError extends Error {
  code: PdfToolErrorCode;
  status: number;
  constructor(code: PdfToolErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "PdfToolError";
  }
}
