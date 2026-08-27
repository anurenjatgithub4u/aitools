// Orchestrates PDF text → validated study material.
//
// Two paths, chosen by document size:
//   small  → generate directly from the page text
//   large  → digest each chunk into structured knowledge, then generate from
//            the combined digest, so a 100-page PDF still informs every mode
//            instead of only the pages that fit in one request.
//
// Server-only: this calls the AI provider and must never be imported by a
// client component.

import { callAI } from "@/lib/ai";
import { chunkPages, fitsSinglePass, formatChunk } from "./chunk";
import {
  buildDigestPrompt,
  buildFlashcardsPrompt,
  buildNotesPrompt,
  buildQuestionsPrompt,
  buildQuizPrompt,
} from "./prompts";
import {
  EmptyGenerationError,
  formatDigest,
  sanitizeDigest,
  sanitizeFlashcards,
  sanitizeNotes,
  sanitizeQuestions,
  sanitizeQuiz,
  type DigestTopic,
} from "./sanitize";
import { STUDY_PACK_COUNTS } from "./config";
import type {
  DetailLevel,
  Difficulty,
  ItemDifficulty,
  PdfPage,
  StudyMode,
  StudyPackResult,
} from "./types";

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}

// Models occasionally wrap JSON in a ```json fence despite being told not to.
// Recovering from that is cheap and safe; anything else is a hard failure.
function parseJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)?.[1];
    if (fenced) {
      try {
        return JSON.parse(fenced.trim());
      } catch {
        /* fall through */
      }
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        /* fall through */
      }
    }
    throw new GenerationError("The AI returned an unreadable response. Please try again.");
  }
}

async function callJson(prompt: string): Promise<unknown> {
  const raw = await callAI(prompt, { json: true });
  return parseJson(raw);
}

export interface GenerationContext {
  pages: PdfPage[];
  pageCount: number;
  fileName: string;
  pageMappingReliable: boolean;
  detail: DetailLevel;
  difficulty: Difficulty;
  quantity: number;
  /** Called as each stage completes, for the progress UI. */
  onStage?: (stage: string) => void;
}

/** Title used when the model doesn't supply one — the filename, tidied up. */
export function fallbackTitleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!base) return "Study Material";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function defaultItemDifficulty(difficulty: Difficulty): ItemDifficulty {
  return difficulty === "mixed" ? "medium" : difficulty;
}

// Builds the text every mode generates from — either the raw pages or, for a
// long document, a digest of them.
async function buildSource(ctx: GenerationContext): Promise<string> {
  if (fitsSinglePass(ctx.pages)) {
    ctx.onStage?.("reading");
    return formatChunk(ctx.pages);
  }

  const chunks = chunkPages(ctx.pages);
  ctx.onStage?.("reading");

  const digests: DigestTopic[] = [];
  for (const chunk of chunks) {
    try {
      const raw = await callJson(buildDigestPrompt(chunk.text, ctx.pageMappingReliable));
      digests.push(...sanitizeDigest(raw, ctx.pageCount, ctx.pageMappingReliable));
    } catch (e) {
      // One failed chunk shouldn't sink a 100-page document — the remaining
      // chunks still produce usable material.
      console.error(`[pdf-study] digest failed for pages ${chunk.firstPage}-${chunk.lastPage}:`, e);
    }
  }

  if (digests.length === 0) {
    throw new GenerationError("We couldn't generate your study materials. Please try again.");
  }

  ctx.onStage?.("topics");
  return formatDigest(digests);
}

export interface GenerationOutcome {
  results: StudyPackResult;
  /** Modes that were requested but produced nothing usable. */
  failed: string[];
}

export async function generateStudyMaterial(
  mode: StudyMode,
  ctx: GenerationContext
): Promise<GenerationOutcome> {
  const source = await buildSource(ctx);

  const sanitizeCtx = {
    fallbackTitle: fallbackTitleFromFileName(ctx.fileName),
    pageCount: ctx.pageCount,
    allowPages: ctx.pageMappingReliable,
    defaultDifficulty: defaultItemDifficulty(ctx.difficulty),
  };

  const results: StudyPackResult = { notes: null, flashcards: null, questions: null, quiz: null };
  const failed: string[] = [];

  const runNotes = async () => {
    ctx.onStage?.("notes");
    const raw = await callJson(buildNotesPrompt(source, ctx.detail, ctx.pageMappingReliable));
    results.notes = sanitizeNotes(raw, sanitizeCtx);
  };

  const runFlashcards = async (quantity: number) => {
    ctx.onStage?.("flashcards");
    const raw = await callJson(
      buildFlashcardsPrompt(source, quantity, ctx.difficulty, ctx.pageMappingReliable)
    );
    results.flashcards = sanitizeFlashcards(raw, sanitizeCtx, quantity);
  };

  const runQuestions = async (quantity: number) => {
    ctx.onStage?.("questions");
    const raw = await callJson(
      buildQuestionsPrompt(source, quantity, ctx.difficulty, ctx.pageMappingReliable)
    );
    results.questions = sanitizeQuestions(raw, sanitizeCtx, quantity);
  };

  const runQuiz = async (quantity: number) => {
    ctx.onStage?.("quiz");
    const raw = await callJson(
      buildQuizPrompt(source, quantity, ctx.difficulty, ctx.pageMappingReliable)
    );
    results.quiz = sanitizeQuiz(raw, sanitizeCtx, quantity);
  };

  // For a study pack a single mode failing shouldn't discard the other three,
  // so each is attempted independently and reported in `failed`.
  const attempt = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      if (mode !== "study-pack") throw e;
      console.error(`[pdf-study] ${label} generation failed:`, e);
      failed.push(label);
    }
  };

  switch (mode) {
    case "notes":
      await attempt("notes", runNotes);
      break;
    case "flashcards":
      await attempt("flashcards", () => runFlashcards(ctx.quantity));
      break;
    case "questions":
      await attempt("questions", () => runQuestions(ctx.quantity));
      break;
    case "quiz":
      await attempt("quiz", () => runQuiz(ctx.quantity));
      break;
    case "study-pack":
      // Sequential rather than parallel: the four calls share one rate limit
      // upstream, and a burst of parallel requests is the fastest way to get
      // 429s back from the provider.
      await attempt("notes", runNotes);
      await attempt("flashcards", () => runFlashcards(STUDY_PACK_COUNTS.flashcards));
      await attempt("questions", () => runQuestions(STUDY_PACK_COUNTS.questions));
      await attempt("quiz", () => runQuiz(STUDY_PACK_COUNTS.quiz));
      break;
  }

  const produced = Object.values(results).some((r) => r !== null);
  if (!produced) {
    throw new GenerationError("We couldn't generate your study materials. Please try again.");
  }

  ctx.onStage?.("done");
  return { results, failed };
}

export { EmptyGenerationError };
