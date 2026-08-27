import type { MVP_OUTPUT_TYPES, PLANNED_OUTPUT_TYPES } from "./config";

// ---------------------------------------------------------------------------
// URL / video identity (spec §4)
// ---------------------------------------------------------------------------

/** What kind of YouTube resource a URL points at. Only `video` is processable;
 *  the rest exist so we can return a specific error instead of a generic one. */
export type YouTubeResourceKind =
  | "video"
  | "shorts"
  | "playlist"
  | "channel"
  | "search"
  | "home"
  | "unknown";

export interface ParsedYouTubeUrl {
  ok: boolean;
  kind: YouTubeResourceKind;
  videoId?: string;
  /** Canonical watch URL, rebuilt from the extracted ID rather than echoed
   *  back from user input. */
  normalizedUrl?: string;
  errorCode?: VideoErrorCode;
}

// ---------------------------------------------------------------------------
// Video metadata (spec §6, §7)
// ---------------------------------------------------------------------------

/** Why a video can't be processed. Each maps to a specific user-facing
 *  message — we never fall back to "something went wrong" for a known state. */
export type VideoErrorCode =
  | "EMPTY_INPUT"
  | "NOT_A_URL"
  | "NOT_YOUTUBE"
  | "NOT_A_VIDEO"
  | "PLAYLIST_UNSUPPORTED"
  | "CHANNEL_UNSUPPORTED"
  | "SEARCH_UNSUPPORTED"
  | "VIDEO_NOT_FOUND"
  | "VIDEO_PRIVATE"
  | "VIDEO_REGION_BLOCKED"
  | "VIDEO_AGE_RESTRICTED"
  | "VIDEO_IS_LIVE"
  | "VIDEO_TOO_LONG"
  | "VIDEO_TOO_SHORT"
  | "NO_TRANSCRIPT"
  | "TRANSCRIPT_UNUSABLE"
  | "TRANSCRIPT_FETCH_FAILED"
  | "METADATA_UNAVAILABLE"
  | "QUOTA_EXCEEDED"
  | "TOO_MANY_JOBS"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "UNKNOWN";

export interface VideoMetadata {
  videoId: string;
  title: string;
  channelTitle: string;
  /** Seconds. The single most important field — it gates the whole pipeline. */
  durationSeconds: number;
  thumbnailUrl: string;
  publishedAt: string | null;
  /** Present when the video is currently live or was a livestream. */
  liveStatus: "none" | "live" | "upcoming" | "completed";
  /** True when YouTube reports the video as age-restricted. */
  ageRestricted: boolean;
  /** Populated when playback is geographically limited. */
  regionBlocked: boolean;
  /** Caption track availability as reported by the API. Advisory only — the
   *  API's flag and what we can actually fetch don't always agree. */
  captionsDeclared: boolean;
}

// ---------------------------------------------------------------------------
// Transcript (spec §8, §10, §24)
// ---------------------------------------------------------------------------

export interface TranscriptSegment {
  /** Seconds from the start of the video. */
  start: number;
  duration: number;
  text: string;
}

export type TranscriptSource = "human" | "auto" | "audio-fallback";

export interface Transcript {
  segments: TranscriptSegment[];
  /** Which caption track we actually used, in the priority order of spec §8. */
  source: TranscriptSource;
  languageCode: string;
  /** Full plain text, normalised. Derived from segments. */
  text: string;
  charCount: number;
  wordCount: number;
}

export type TranscriptQualityRating = "GOOD" | "ACCEPTABLE" | "POOR" | "UNUSABLE";

export interface TranscriptQuality {
  rating: TranscriptQualityRating;
  wordCount: number;
  /** 0–1. Share of the transcript made up of repeated phrases. */
  repetitionRatio: number;
  /** 0–1. Share of tokens that are noise markers or unintelligible. */
  noiseRatio: number;
  averageWordLength: number;
  /** Human-readable reasons, shown to the user for POOR and UNUSABLE. */
  reasons: string[];
  /** Whether the user may choose to continue anyway. False for UNUSABLE. */
  canProceed: boolean;
}

// ---------------------------------------------------------------------------
// Content classification (spec §11, §12)
// ---------------------------------------------------------------------------

export type ContentType =
  | "EDUCATIONAL"
  | "TUTORIAL"
  | "LECTURE"
  | "PODCAST"
  | "INTERVIEW"
  | "NEWS"
  | "TECHNICAL"
  | "BUSINESS"
  | "SELF_HELP"
  | "ENTERTAINMENT"
  | "MUSIC"
  | "OTHER";

export interface ContentClassification {
  contentType: ContentType;
  /** 0–1 self-reported confidence. Used to decide whether to warn the user. */
  confidence: number;
  /** True when the video has too little informational content for structured
   *  output — music videos, ambience, pure entertainment (spec §12). */
  lowInformation: boolean;
  reason: string;
}

// ---------------------------------------------------------------------------
// Chunking (spec §14)
// ---------------------------------------------------------------------------

export interface TranscriptChunk {
  index: number;
  /** Seconds — preserved so generated output can cite timestamps (spec §24). */
  startSeconds: number;
  endSeconds: number;
  text: string;
  charCount: number;
}

// ---------------------------------------------------------------------------
// Knowledge representation (spec §15)
// ---------------------------------------------------------------------------
//
// This is the intermediate artefact the whole design rests on. Every output
// type is generated from this, not from the raw transcript, so switching from
// Notes to Study Guide costs one cheap call instead of reprocessing the video.

export interface TimestampedItem {
  text: string;
  /** Seconds. Null when the model couldn't attribute it to a moment. */
  at: number | null;
}

export interface Definition {
  term: string;
  definition: string;
  at: number | null;
}

export interface KnowledgeStep {
  order: number;
  instruction: string;
  detail: string;
  at: number | null;
}

export interface ChapterMarker {
  title: string;
  at: number;
}

export interface KnowledgeRepresentation {
  title: string;
  contentType: ContentType;
  /** One-paragraph orientation, written from the transcript only. */
  overview: string;
  mainTopics: string[];
  keyConcepts: TimestampedItem[];
  definitions: Definition[];
  examples: TimestampedItem[];
  steps: KnowledgeStep[];
  importantQuotes: TimestampedItem[];
  /** Assertions the speaker makes. Kept separate from concepts so output can
   *  attribute them rather than presenting them as established fact. */
  claims: TimestampedItem[];
  tools: string[];
  resources: string[];
  actionItems: string[];
  /** Chapter-style markers derived from topic shifts (spec §14). */
  timestamps: ChapterMarker[];
  /** Set when the transcript didn't support a confident extraction, so
   *  downstream output can hedge instead of inventing. */
  gaps: string[];
}

// ---------------------------------------------------------------------------
// Outputs (spec §13)
// ---------------------------------------------------------------------------

export type MvpOutputType = (typeof MVP_OUTPUT_TYPES)[number];
export type PlannedOutputType = (typeof PLANNED_OUTPUT_TYPES)[number];
export type OutputType = MvpOutputType | PlannedOutputType;

export interface GeneratedOutput {
  outputType: OutputType;
  /** Markdown for notes/study guides; plain text for the AI prompts. */
  content: string;
  /** Populated for prompt outputs so the UI can offer "Open in ChatGPT". */
  targetModel?: "chatgpt" | "claude";
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Jobs (spec §19, §20, §21)
// ---------------------------------------------------------------------------

export type JobStatus =
  | "QUEUED"
  | "VALIDATING"
  | "FETCHING_TRANSCRIPT"
  | "CHECKING_TRANSCRIPT"
  | "EXTRACTING_KNOWLEDGE"
  | "GENERATING_OUTPUT"
  | "COMPLETED"
  | "FAILED";

/** Ordered for the progress UI. Only stages that map to real backend work
 *  appear here — the UI never invents a percentage (spec §20). */
export const JOB_STAGE_ORDER: JobStatus[] = [
  "QUEUED",
  "VALIDATING",
  "FETCHING_TRANSCRIPT",
  "CHECKING_TRANSCRIPT",
  "EXTRACTING_KNOWLEDGE",
  "GENERATING_OUTPUT",
  "COMPLETED",
];

export const JOB_STAGE_LABELS: Record<JobStatus, string> = {
  QUEUED: "Queued",
  VALIDATING: "Video validated",
  FETCHING_TRANSCRIPT: "Transcript retrieved",
  CHECKING_TRANSCRIPT: "Transcript quality checked",
  EXTRACTING_KNOWLEDGE: "Extracting key concepts",
  GENERATING_OUTPUT: "Creating your output",
  COMPLETED: "Finalised",
  FAILED: "Failed",
};

export interface ChunkJobState {
  chunkIndex: number;
  status: "pending" | "done" | "failed";
  attemptCount: number;
  error?: string;
}

export interface JobRecord {
  jobId: string;
  videoId: string;
  status: JobStatus;
  outputType: OutputType;
  attemptCount: number;
  chunks: ChunkJobState[];
  errorCode?: VideoErrorCode;
  /** Internal detail for logs only — never returned to the client (spec §33). */
  errorDetail?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Observability (spec §30)
// ---------------------------------------------------------------------------

export interface ProcessingMetrics {
  videoId: string;
  videoDurationSeconds: number;
  transcriptChars: number;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
  processingMs: number;
  modelUsed: string;
  cacheHit: boolean;
  status: JobStatus;
  failureReason?: string;
  contentType?: ContentType;
  outputType: OutputType;
  estimatedCostUsd: number;
}

// ---------------------------------------------------------------------------
// API contracts
// ---------------------------------------------------------------------------

export interface AnalyzeResponse {
  ok: boolean;
  videoId?: string;
  metadata?: VideoMetadata;
  /** True when we already hold a fresh knowledge representation, so the client
   *  can skip straight to output selection (spec §17, §18). */
  cached?: boolean;
  quality?: TranscriptQuality;
  classification?: ContentClassification;
  jobId?: string;
  errorCode?: VideoErrorCode;
  error?: string;
}
