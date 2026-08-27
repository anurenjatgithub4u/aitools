// The single entry point every API route uses instead of importing
// compressor.ts / splitter.ts / merger.ts directly (spec §20: "Do not
// tightly couple ... to the underlying PDF library"). If pdf-lib is ever
// swapped for something else, only this file and the three modules it
// wraps need to change — nothing that calls PdfService does.

import type { PDFDocument } from "pdf-lib";
import { compressPdf } from "./compressor";
import { splitPdf } from "./splitter";
import { mergePdfs } from "./merger";
import type {
  CompressRequestOptions,
  CompressResultMeta,
  MergeRequestOptions,
  MergeResultMeta,
  SplitRequestOptions,
  SplitResultMeta,
} from "./types";

export const PdfService = {
  async compress(
    bytes: Uint8Array,
    doc: PDFDocument,
    options: CompressRequestOptions
  ): Promise<{ bytes: Uint8Array; meta: CompressResultMeta }> {
    return compressPdf(bytes, doc, options);
  },

  async split(
    doc: PDFDocument,
    sourceFileName: string,
    options: SplitRequestOptions
  ): Promise<{ payload: Uint8Array; contentType: string; downloadName: string; meta: SplitResultMeta }> {
    return splitPdf(doc, sourceFileName, options);
  },

  async merge(
    sources: { fileName: string; doc: PDFDocument }[],
    options: MergeRequestOptions
  ): Promise<{ bytes: Uint8Array; meta: MergeResultMeta }> {
    return mergePdfs(sources, options);
  },
};
