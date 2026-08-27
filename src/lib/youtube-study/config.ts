// Every limit, threshold and feature flag for the YouTube → AI knowledge
// utility lives here so the economics can be tuned in one place.
//
// Anything the server enforces is duplicated to the client only for *display*.
// The backend never trusts a client-sent duration, video ID, or quota claim.

// ---------------------------------------------------------------------------
// Hard video limits (spec §5 — enforced server-side, never frontend-only)
// ---------------------------------------------------------------------------

/** Maximum supported video duration for the MVP. Deliberately conservative:
 *  it bounds transcript size, token spend and processing time while we learn
 *  the real usage numbers. */
export const MAX_VIDEO_SECONDS = 60 * 60; // 1 hour

/** Videos shorter than this rarely contain enough speech to be worth
 *  processing, and are usually music clips or fragments. */
export const MIN_VIDEO_SECONDS = 30;

// ---------------------------------------------------------------------------
// Transcript size limits (spec §16)
// ---------------------------------------------------------------------------

/** Above this the transcript is compressed via chunk summarisation rather than
 *  being handed to the model whole. A 60-minute talk is typically 90–120k
 *  characters, so most videos at our ceiling land near this line. */
export const SINGLE_PASS_CHAR_LIMIT = 90_000;

/** Absolute ceiling on transcript characters we will accept into the pipeline.
 *  Guards against pathological caption tracks (karaoke-style repeats, badly
 *  duplicated auto-captions) that would otherwise balloon a request. */
export const MAX_TRANSCRIPT_CHARS = 400_000;

/** Target size of one chunk sent to the model. Sized to sit well inside the
 *  context window of both configured providers, leaving room for the
 *  instructions and the JSON response. */
export const TARGET_CHUNK_CHARS = 55_000;

/** Hard ceiling on chunk count so a dense hour can't fan out into unbounded
 *  model calls. At TARGET_CHUNK_CHARS this covers ~440k characters. */
export const MAX_CHUNKS = 8;

/** Rough chars-per-token for English speech. Only used for cost estimation and
 *  chunk sizing — never as a hard token limit. */
export const CHARS_PER_TOKEN_ESTIMATE = 4;

// ---------------------------------------------------------------------------
// Transcript quality thresholds (spec §10)
// ---------------------------------------------------------------------------

/** Below this many usable words there is not enough content to summarise
 *  honestly, whatever the video claims to be about. */
export const MIN_USABLE_WORDS = 150;

/** Word counts below this are workable but thin — worth a warning. */
export const POOR_WORD_THRESHOLD = 400;

/** Fraction of the transcript allowed to be repeated phrases before we treat
 *  it as degraded. Auto-captions on music videos routinely exceed this. */
export const MAX_REPETITION_RATIO = 0.4;

/** Fraction of tokens allowed to be unintelligible markers ([Music],
 *  [Applause], [Inaudible], stray punctuation runs) before quality drops. */
export const MAX_NOISE_RATIO = 0.35;

/** Minimum average word length. Broken or mojibake text tends to fall below
 *  this because it fragments into stray characters. */
export const MIN_AVG_WORD_LENGTH = 2.5;

// ---------------------------------------------------------------------------
// Cost protection — daily limits, enforced server-side (spec §27)
// ---------------------------------------------------------------------------

/** A full video analysis (transcript → knowledge) is the expensive operation.
 *  Generating an additional output from *cached* knowledge is cheap, which is
 *  why the two are metered separately. */
export const MAX_ANONYMOUS_VIDEOS_PER_DAY = 3;
export const MAX_AUTH_VIDEOS_PER_DAY = 15;

export const MAX_ANONYMOUS_OUTPUTS_PER_DAY = 6;
export const MAX_AUTH_OUTPUTS_PER_DAY = 40;

/** Concurrent in-flight analysis jobs per identity. Stops one caller from
 *  queuing twenty videos at once (spec §28). */
export const MAX_CONCURRENT_JOBS = 2;

// ---------------------------------------------------------------------------
// Retry policy (spec §21)
// ---------------------------------------------------------------------------

/** Per-chunk attempts before a chunk is abandoned. A single failed chunk does
 *  not restart the whole video. */
export const MAX_CHUNK_ATTEMPTS = 3;

/** Whole-job attempts before the job is marked FAILED. */
export const MAX_JOB_ATTEMPTS = 2;

/** A job stuck in a non-terminal state longer than this is considered dead and
 *  can be reclaimed — serverless functions can be killed mid-run. */
export const JOB_STALE_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Caching (spec §17)
// ---------------------------------------------------------------------------

/** How long a cached knowledge representation stays fresh. Transcripts rarely
 *  change, but captions do get corrected and videos get re-uploaded. */
export const KNOWLEDGE_TTL_DAYS = 30;

/** Raw transcripts are processing intermediates, not user content, so they
 *  expire quickly (spec §29). The knowledge representation is what we keep. */
export const RAW_TRANSCRIPT_TTL_HOURS = 24;

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

/** Audio transcription (Whisper-style) as a fallback when no captions exist.
 *  Off by default — it is materially more expensive than caption extraction
 *  and the MVP deliberately does not depend on it (spec §9). */
export const ENABLE_AUDIO_TRANSCRIPTION_FALLBACK =
  process.env.ENABLE_AUDIO_TRANSCRIPTION_FALLBACK === "true";

/** Which transcript provider to use. See lib/youtube-study/transcript/.
 *
 *  "auto" (default) tries the free timedtext method first and falls back to
 *  Apify when it can't retrieve captions. Set to "timedtext" or "apify" to
 *  pin one provider with no fallback — useful for isolating a problem. */
export const TRANSCRIPT_PROVIDER = process.env.YOUTUBE_TRANSCRIPT_PROVIDER || "auto";

// ---------------------------------------------------------------------------
// Output types available in the MVP (spec §13, §34)
// ---------------------------------------------------------------------------

/** Shipping now. The remaining output types are designed for but not built. */
export const MVP_OUTPUT_TYPES = [
  "smart-notes",
  "study-guide",
  "chatgpt-prompt",
  "claude-prompt",
] as const;

/** Designed for, not yet built — the UI shows these as coming soon. */
export const PLANNED_OUTPUT_TYPES = [
  "key-takeaways",
  "quiz",
  "flashcards",
  "playbook",
] as const;
