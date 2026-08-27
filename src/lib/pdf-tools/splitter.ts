// Extract pages / split every page / split by ranges — all three modes
// share one code path (copy a set of page indices into a fresh PDFDocument)
// and only differ in how the page-index groups are computed.

import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { MAX_SPLIT_OUTPUT_FILES } from "./config";
import { PdfToolError, type PageRange, type SplitRequestOptions, type SplitResultMeta } from "./types";

interface SplitOutput {
  fileName: string;
  bytes: Uint8Array;
}

export async function splitPdf(
  doc: PDFDocument,
  sourceFileName: string,
  options: SplitRequestOptions
): Promise<{ payload: Uint8Array; contentType: string; downloadName: string; meta: SplitResultMeta }> {
  const pageCount = doc.getPageCount();
  const baseName = sourceFileName.replace(/\.pdf$/i, "") || "document";

  const groups = resolveGroups(options, pageCount);
  if (groups.length === 0) {
    throw new PdfToolError("invalid_range", "Nothing to split — select at least one page or range.");
  }
  if (groups.length > MAX_SPLIT_OUTPUT_FILES) {
    throw new PdfToolError(
      "invalid_range",
      `That would produce too many files (limit is ${MAX_SPLIT_OUTPUT_FILES}).`
    );
  }

  const outputs: SplitOutput[] = [];
  for (let i = 0; i < groups.length; i++) {
    const indices = groups[i];
    const out = await PDFDocument.create();
    const copied = await out.copyPages(doc, indices);
    copied.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    outputs.push({ fileName: fileNameFor(options.mode, baseName, i, indices, groups.length), bytes });
  }

  if (outputs.length === 1) {
    return {
      payload: outputs[0].bytes,
      contentType: "application/pdf",
      downloadName: outputs[0].fileName,
      meta: { pageCount, outputFileCount: 1, isZip: false },
    };
  }

  const zip = new JSZip();
  for (const out of outputs) zip.file(out.fileName, out.bytes);
  const zipped = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  return {
    payload: zipped,
    contentType: "application/zip",
    downloadName: `${baseName}-split.zip`,
    meta: { pageCount, outputFileCount: outputs.length, isZip: true },
  };
}

/** Each group is a 0-based array of page indices to copy into one output file. */
function resolveGroups(options: SplitRequestOptions, pageCount: number): number[][] {
  if (options.mode === "extract") {
    const pages = (options.pages ?? []).filter((p) => Number.isInteger(p) && p >= 1 && p <= pageCount);
    if (pages.length === 0) return [];
    return [pages.map((p) => p - 1)];
  }

  if (options.mode === "every") {
    return Array.from({ length: pageCount }, (_, i) => [i]);
  }

  // ranges
  const ranges = options.ranges ?? [];
  validateRanges(ranges, pageCount);
  return ranges.map((r) => {
    const indices: number[] = [];
    for (let p = r.start; p <= r.end; p++) indices.push(p - 1);
    return indices;
  });
}

function validateRanges(ranges: PageRange[], pageCount: number): void {
  if (ranges.length === 0) {
    throw new PdfToolError("invalid_range", "Add at least one page range.");
  }
  for (const r of ranges) {
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) {
      throw new PdfToolError("invalid_range", "Page ranges must be whole numbers.");
    }
    if (r.start < 1 || r.end > pageCount) {
      throw new PdfToolError("invalid_range", `Page numbers must be between 1 and ${pageCount}.`);
    }
    if (r.start > r.end) {
      throw new PdfToolError("invalid_range", "A range's start page must not be after its end page.");
    }
  }
}

function fileNameFor(
  mode: SplitRequestOptions["mode"],
  baseName: string,
  index: number,
  indices: number[],
  total: number
): string {
  if (mode === "extract") return `${baseName}-selected-pages.pdf`;
  if (mode === "every") {
    const num = String(index + 1).padStart(String(total).length + 1, "0");
    return `page-${num}.pdf`;
  }
  // ranges
  return `${baseName}-part-${index + 1}.pdf`;
}
