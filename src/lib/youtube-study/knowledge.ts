// Knowledge extraction pipeline (spec §11, §14, §15, §16, §21).
//
// Two model tiers are used deliberately (spec §16): classification and
// per-chunk extraction run on the fast model, and the final merge — where
// quality actually shows in the output — runs on the strong one.
//
// Chunks are processed independently and retried independently, so one bad
// chunk costs one retry rather than reprocessing the whole video (spec §21).

import { callAI } from "@/lib/ai";
import type {
  ChapterMarker,
  ChunkJobState,
  ContentClassification,
  ContentType,
  Definition,
  KnowledgeRepresentation,
  KnowledgeStep,
  TimestampedItem,
  Transcript,
  TranscriptChunk,
} from "./types";
import { MAX_CHUNK_ATTEMPTS } from "./config";
import { chunkExtractionPrompt, classificationPrompt, mergePrompt } from "./prompts";
import { renderChunkForPrompt } from "./chunk";

const CONTENT_TYPES: ContentType[] = [
  "EDUCATIONAL", "TUTORIAL", "LECTURE", "PODCAST", "INTERVIEW", "NEWS",
  "TECHNICAL", "BUSINESS", "SELF_HELP", "ENTERTAINMENT", "MUSIC", "OTHER",
];

/** Models occasionally wrap JSON in prose or fences despite being told not to. */
function parseJson<T>(raw: string): T | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to the outermost brace pair.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Sanitisers — never trust model output to match the schema
// ---------------------------------------------------------------------------

const str = (v: unknown, max = 2000): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const strArray = (v: unknown, max = 30, len = 300): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, max)
    : [];

function seconds(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function timestamped(v: unknown, max = 30): TimestampedItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (typeof item === "string") return { text: item.trim().slice(0, 800), at: null };
      const o = item as Record<string, unknown>;
      return { text: str(o.text, 800), at: seconds(o.at) };
    })
    .filter((i) => i.text.length > 0)
    .slice(0, max);
}

function definitions(v: unknown, max = 25): Definition[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      const o = item as Record<string, unknown>;
      return { term: str(o.term, 120), definition: str(o.definition, 800), at: seconds(o.at) };
    })
    .filter((d) => d.term && d.definition)
    .slice(0, max);
}

function steps(v: unknown, max = 30): KnowledgeStep[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item, i) => {
      const o = item as Record<string, unknown>;
      const order = seconds(o.order);
      return {
        order: order ?? i + 1,
        instruction: str(o.instruction, 400),
        detail: str(o.detail, 800),
        at: seconds(o.at),
      };
    })
    .filter((s) => s.instruction)
    .slice(0, max);
}

function chapters(v: unknown, max = 25): ChapterMarker[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      const o = item as Record<string, unknown>;
      return { title: str(o.title, 160), at: seconds(o.at) ?? 0 };
    })
    .filter((c) => c.title)
    .sort((a, b) => a.at - b.at)
    .slice(0, max);
}

// ---------------------------------------------------------------------------
// Stage 1 — classification (fast tier)
// ---------------------------------------------------------------------------

export async function classifyContent(
  title: string,
  channel: string,
  transcript: Transcript
): Promise<ContentClassification> {
  // Sample from the start and middle: intros are often unrepresentative.
  const text = transcript.text;
  const sample = text.length > 8000
    ? `${text.slice(0, 4000)}\n...\n${text.slice(Math.floor(text.length / 2), Math.floor(text.length / 2) + 3000)}`
    : text;

  try {
    const raw = await callAI(classificationPrompt(title, channel, sample), {
      json: true,
      tier: "fast",
      retries: 2,
    });
    const parsed = parseJson<Record<string, unknown>>(raw);
    if (!parsed) throw new Error("unparseable classification");

    const claimed = str(parsed.content_type, 40).toUpperCase() as ContentType;
    const contentType = CONTENT_TYPES.includes(claimed) ? claimed : "OTHER";
    const confidenceRaw = Number(parsed.confidence);

    return {
      contentType,
      confidence: Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0.5,
      lowInformation: parsed.low_information === true || contentType === "MUSIC",
      reason: str(parsed.reason, 300) || "Classified from title and transcript sample.",
    };
  } catch (e) {
    console.error("[youtube-study:classify] falling back to OTHER:", e);
    // Classification is an optimisation, not a gate — a failure here should
    // not stop the user getting notes.
    return {
      contentType: "OTHER",
      confidence: 0,
      lowInformation: false,
      reason: "Could not classify automatically; using general extraction.",
    };
  }
}

// ---------------------------------------------------------------------------
// Stage 2 — per-chunk extraction (fast tier, independently retryable)
// ---------------------------------------------------------------------------

export interface ChunkExtractionOutcome {
  states: ChunkJobState[];
  partials: string[];
}

/** Extracts one chunk, retrying on failure up to MAX_CHUNK_ATTEMPTS. */
async function extractChunk(
  chunk: TranscriptChunk,
  transcript: Transcript,
  contentType: ContentType,
  title: string
): Promise<{ ok: true; json: string } | { ok: false; error: string; attempts: number }> {
  const rendered = renderChunkForPrompt(chunk, transcript.segments);
  const prompt = chunkExtractionPrompt(chunk, rendered, contentType, title);

  let lastError = "unknown";
  for (let attempt = 1; attempt <= MAX_CHUNK_ATTEMPTS; attempt++) {
    try {
      const raw = await callAI(prompt, { json: true, tier: "fast", retries: 1 });
      const parsed = parseJson<Record<string, unknown>>(raw);
      if (!parsed) throw new Error("unparseable chunk extraction");
      return { ok: true, json: JSON.stringify(parsed) };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(
        `[youtube-study:extract] chunk ${chunk.index} attempt ${attempt}/${MAX_CHUNK_ATTEMPTS}: ${lastError}`
      );
      if (attempt < MAX_CHUNK_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
  }
  return { ok: false, error: lastError, attempts: MAX_CHUNK_ATTEMPTS };
}

/**
 * Extracts every chunk, reporting per-chunk state so a caller can retry just
 * the failures rather than the whole video (spec §21).
 *
 * Chunks run sequentially on purpose: parallel calls hit provider rate limits
 * far sooner, and this path is already behind an async job.
 */
export async function extractChunks(
  chunks: TranscriptChunk[],
  transcript: Transcript,
  contentType: ContentType,
  title: string,
  onProgress?: (done: number, total: number) => void
): Promise<ChunkExtractionOutcome> {
  const states: ChunkJobState[] = [];
  const partials: string[] = [];

  for (const chunk of chunks) {
    const result = await extractChunk(chunk, transcript, contentType, title);
    if (result.ok) {
      states.push({ chunkIndex: chunk.index, status: "done", attemptCount: 1 });
      partials.push(`--- Section ${chunk.index + 1} ---\n${result.json}`);
    } else {
      states.push({
        chunkIndex: chunk.index,
        status: "failed",
        attemptCount: result.attempts,
        error: result.error,
      });
    }
    onProgress?.(states.length, chunks.length);
  }

  return { states, partials };
}

// ---------------------------------------------------------------------------
// Stage 3 — merge into the knowledge representation (strong tier)
// ---------------------------------------------------------------------------

export async function mergeKnowledge(
  title: string,
  contentType: ContentType,
  partials: string[]
): Promise<KnowledgeRepresentation> {
  const raw = await callAI(mergePrompt(title, contentType, partials.join("\n\n")), {
    json: true,
    tier: "strong",
    retries: 2,
  });

  const parsed = parseJson<Record<string, unknown>>(raw);
  if (!parsed) throw new Error("Could not parse the merged knowledge representation");

  return {
    title,
    contentType,
    overview: str(parsed.overview, 2000),
    mainTopics: strArray(parsed.main_topics, 15, 160),
    keyConcepts: timestamped(parsed.key_concepts, 12),
    definitions: definitions(parsed.definitions, 10),
    examples: timestamped(parsed.examples, 8),
    steps: steps(parsed.steps, 25),
    importantQuotes: timestamped(parsed.important_quotes, 6),
    claims: timestamped(parsed.claims, 10),
    tools: strArray(parsed.tools, 20, 120),
    resources: strArray(parsed.resources, 20, 240),
    actionItems: strArray(parsed.action_items, 15, 300),
    timestamps: chapters(parsed.chapters, 25),
    gaps: strArray(parsed.gaps, 10, 240),
  };
}

/**
 * Single-chunk fast path.
 *
 * When a transcript fits in one chunk there is nothing to merge, so we skip
 * the second model call entirely and extract straight into the final shape.
 */
export async function extractSingleChunk(
  chunk: TranscriptChunk,
  transcript: Transcript,
  contentType: ContentType,
  title: string
): Promise<KnowledgeRepresentation> {
  const rendered = renderChunkForPrompt(chunk, transcript.segments);
  const raw = await callAI(chunkExtractionPrompt(chunk, rendered, contentType, title), {
    json: true,
    tier: "strong",
    retries: 2,
  });

  const parsed = parseJson<Record<string, unknown>>(raw);
  if (!parsed) throw new Error("Could not parse the knowledge extraction");

  const concepts = timestamped(parsed.key_concepts, 12);
  return {
    title,
    contentType,
    // The chunk prompt doesn't ask for an overview; derive one from the
    // concepts rather than making a second call for a single paragraph.
    overview:
      str(parsed.overview, 2000) ||
      concepts.slice(0, 3).map((c) => c.text).join(" ") ||
      "This video's main points are listed below.",
    mainTopics: strArray(parsed.main_topics, 15, 160),
    keyConcepts: concepts,
    definitions: definitions(parsed.definitions, 10),
    examples: timestamped(parsed.examples, 8),
    steps: steps(parsed.steps, 25),
    importantQuotes: timestamped(parsed.important_quotes, 6),
    claims: timestamped(parsed.claims, 10),
    tools: strArray(parsed.tools, 20, 120),
    resources: strArray(parsed.resources, 20, 240),
    actionItems: strArray(parsed.action_items, 15, 300),
    timestamps: chapters(parsed.chapters, 25),
    gaps: strArray(parsed.gaps, 10, 240),
  };
}
