// Every limit for the PDF → study material utility lives here so the caps can
// be tuned in one place instead of being scattered through routes and UI.
// Anything the server enforces is duplicated to the client only for *display*
// — the server never trusts a client-sent limit.

// ---------------------------------------------------------------------------
// Upload limits
// ---------------------------------------------------------------------------

export const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_PDF_PAGES = 100;
export const MAX_PDFS_PER_GENERATION = 1;

// Below this many extractable characters we treat the PDF as scanned/image-only
// rather than pretending we can generate study material from it.
export const MIN_EXTRACTABLE_CHARS = 200;

// Ceiling on the extracted text we hand back to the browser and accept back on
// generate. A 100-page text PDF is typically 150–250k chars; this leaves room
// without letting a pathological file balloon the request.
export const MAX_EXTRACTED_CHARS = 400_000;

// ---------------------------------------------------------------------------
// Generation quantity limits (server-enforced — the client picker only offers
// a subset of these, but a hand-crafted request still can't exceed them)
// ---------------------------------------------------------------------------

export const MAX_FLASHCARDS = 50;
export const MAX_QUESTIONS = 50;
export const MAX_QUIZ_QUESTIONS = 30;
export const MAX_NOTE_SECTIONS = 10;

export const FLASHCARD_QUANTITY_OPTIONS = [10, 20, 30, 50] as const;
export const QUESTION_QUANTITY_OPTIONS = [10, 20, 30, 50] as const;
export const QUIZ_QUANTITY_OPTIONS = [5, 10, 20, 30] as const;

export const DEFAULT_FLASHCARD_QUANTITY = 20;
export const DEFAULT_QUESTION_QUANTITY = 20;
export const DEFAULT_QUIZ_QUANTITY = 10;

// What a Study Pack generates for each mode.
export const STUDY_PACK_COUNTS = {
  flashcards: 20,
  questions: 20,
  quiz: 10,
} as const;

// ---------------------------------------------------------------------------
// Cost protection — daily generation caps, enforced server-side
// ---------------------------------------------------------------------------

export const MAX_ANONYMOUS_GENERATIONS_PER_DAY = 5;
export const MAX_AUTH_GENERATIONS_PER_DAY = 20;

// A Study Pack runs several AI calls, so it costs more than a single mode.
// Charged as this many units against the daily cap.
export const STUDY_PACK_COST_UNITS = 3;

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

// Rough chars-per-token for English prose. Only used to size chunks — never as
// a hard token limit, since the real ceiling depends on the configured model.
export const CHARS_PER_TOKEN_ESTIMATE = 4;

// Target size of a single chunk of PDF text sent to the model. Sized well
// inside the context window of both configured defaults (gemini-2.5-flash and
// gpt-4o-mini) so a chunk plus its instructions and JSON output always fits.
export const TARGET_CHUNK_CHARS = 60_000;

// Above this many chars we summarise chunk-by-chunk first, then generate from
// the combined summary instead of stuffing everything into one request.
export const SINGLE_PASS_CHAR_LIMIT = 90_000;

// Hard ceiling on chunks so a 100-page PDF can't fan out into unbounded calls.
export const MAX_CHUNKS = 6;
