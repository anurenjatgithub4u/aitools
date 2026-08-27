// Turns extracted pages into model-sized chunks.
//
// A 100-page PDF can easily be 250k characters, which is both expensive and
// unreliable to send as one request. Chunking on *page boundaries* (never
// mid-page) keeps the "Source: pages 12–13" references honest, because every
// chunk still knows exactly which pages it covers.

import { MAX_CHUNKS, SINGLE_PASS_CHAR_LIMIT, TARGET_CHUNK_CHARS } from "./config";
import type { PdfPage } from "./types";

export interface Chunk {
  index: number;
  firstPage: number;
  lastPage: number;
  text: string;
}

// Renders a chunk with explicit page markers so the model can attribute each
// fact to a real page instead of guessing.
export function formatChunk(pages: PdfPage[]): string {
  return pages
    .filter((p) => p.text.trim().length > 0)
    .map((p) => `[PAGE ${p.page}]\n${p.text}`)
    .join("\n\n");
}

export function totalChars(pages: PdfPage[]): number {
  return pages.reduce((sum, p) => sum + p.text.length, 0);
}

// True when the whole document comfortably fits in one request, so we can skip
// the summarise-then-generate path entirely.
export function fitsSinglePass(pages: PdfPage[]): boolean {
  return totalChars(pages) <= SINGLE_PASS_CHAR_LIMIT;
}

export function chunkPages(pages: PdfPage[]): Chunk[] {
  const usable = pages.filter((p) => p.text.trim().length > 0);
  if (usable.length === 0) return [];

  // With a hard cap on chunk count, a very large PDF gets proportionally
  // larger chunks rather than being silently cut off after MAX_CHUNKS.
  const target = Math.max(TARGET_CHUNK_CHARS, Math.ceil(totalChars(usable) / MAX_CHUNKS));

  const chunks: Chunk[] = [];
  let current: PdfPage[] = [];
  let currentChars = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push({
      index: chunks.length,
      firstPage: current[0].page,
      lastPage: current[current.length - 1].page,
      text: formatChunk(current),
    });
    current = [];
    currentChars = 0;
  };

  for (const page of usable) {
    // Never split a page across chunks — start a new chunk instead, unless the
    // current one is still empty (a single oversized page has to go somewhere).
    if (currentChars > 0 && currentChars + page.text.length > target) flush();
    current.push(page);
    currentChars += page.text.length;
  }
  flush();

  return chunks;
}
