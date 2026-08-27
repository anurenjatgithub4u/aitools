// Merges PDFDocuments in the exact order the caller provides — the API
// route is responsible for that order matching what the user arranged in
// the UI (see the merge route: files are appended to FormData in list
// order, and order is never re-sorted server-side).

import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import type { MergeRequestOptions, MergeResultMeta } from "./types";

interface MergeSource {
  fileName: string;
  doc: PDFDocument;
}

export async function mergePdfs(
  sources: MergeSource[],
  options: MergeRequestOptions
): Promise<{ bytes: Uint8Array; meta: MergeResultMeta }> {
  const out = await PDFDocument.create();
  const firstPageIndexOfSource: number[] = [];

  for (const source of sources) {
    const indices = source.doc.getPageIndices();
    const copied = await out.copyPages(source.doc, indices);
    firstPageIndexOfSource.push(out.getPageCount());
    copied.forEach((p) => out.addPage(p));
  }

  if (options.preserveMetadata && sources.length > 0) {
    try {
      const first = sources[0].doc;
      if (first.getTitle()) out.setTitle(first.getTitle()!);
      if (first.getAuthor()) out.setAuthor(first.getAuthor()!);
      if (first.getSubject()) out.setSubject(first.getSubject()!);
      const kw = first.getKeywords();
      if (kw) out.setKeywords(kw.split(",").map((k) => k.trim()).filter(Boolean));
    } catch {
      // Best-effort — a source with unreadable metadata just means we skip it.
    }
  }
  out.setProducer("FindUrAI");

  if (options.addBookmarks && sources.length > 0) {
    try {
      addFlatBookmarks(out, sources, firstPageIndexOfSource);
    } catch (e) {
      // Bookmarks are a nice-to-have — never let a malformed outline tree
      // take down an otherwise-successful merge.
      console.error("[pdf-tools:merge] bookmark generation failed, continuing without:", e);
    }
  }

  const bytes = await out.save({ useObjectStreams: true });
  return {
    bytes,
    meta: { fileCount: sources.length, pageCount: out.getPageCount(), resultBytes: bytes.length },
  };
}

/** One flat, top-level bookmark per source file, pointing at its first page. */
function addFlatBookmarks(out: PDFDocument, sources: MergeSource[], firstPageIndexOfSource: number[]): void {
  const context = out.context;
  const n = sources.length;

  const rootRef = context.register(context.obj({}));
  const itemRefs = Array.from({ length: n }, () => context.register(context.obj({})));

  for (let i = 0; i < n; i++) {
    const title = sources[i].fileName.replace(/\.pdf$/i, "");
    const pageRef = out.getPage(firstPageIndexOfSource[i]).ref;
    context.assign(
      itemRefs[i],
      context.obj({
        Title: PDFString.of(title),
        Parent: rootRef,
        Dest: context.obj([pageRef, "Fit"]),
        ...(i > 0 ? { Prev: itemRefs[i - 1] } : {}),
        ...(i < n - 1 ? { Next: itemRefs[i + 1] } : {}),
      })
    );
  }

  context.assign(
    rootRef,
    context.obj({ Type: "Outlines", First: itemRefs[0], Last: itemRefs[n - 1], Count: n })
  );

  out.catalog.set(PDFName.of("Outlines"), rootRef);
}
