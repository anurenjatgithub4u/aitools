// Shared shapes for the PDF → study material utility. These are the contract
// between the API routes, the sanitizer and the UI — the sanitizer guarantees
// anything typed as one of these has already been coerced into a safe shape.

export type StudyMode = "notes" | "flashcards" | "questions" | "quiz" | "study-pack";

export type DetailLevel = "quick" | "standard" | "detailed";

export type Difficulty = "easy" | "medium" | "hard" | "mixed";

// Difficulty as it appears on a generated item — "mixed" is a request-level
// instruction, never a label on an individual question.
export type ItemDifficulty = "easy" | "medium" | "hard";

export const STUDY_MODES: StudyMode[] = ["notes", "flashcards", "questions", "quiz", "study-pack"];
export const DETAIL_LEVELS: DetailLevel[] = ["quick", "standard", "detailed"];
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "mixed"];

// ---------------------------------------------------------------------------
// PDF extraction
// ---------------------------------------------------------------------------

export interface PdfPage {
  page: number;
  text: string;
}

export interface PdfMeta {
  fileName: string;
  pageCount: number;
  byteSize: number;
  charCount: number;
  // False when the PDF yielded too little text to work with (likely scanned).
  hasExtractableText: boolean;
  // True when page-level text survived extraction, so sourcePages references
  // can be trusted. When false the UI hides page references entirely rather
  // than showing numbers we can't stand behind.
  pageMappingReliable: boolean;
}

export interface ExtractResponse {
  meta: PdfMeta;
  pages: PdfPage[];
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export interface NoteDefinition {
  term: string;
  definition: string;
}

export interface NoteSection {
  title: string;
  summary: string;
  keyPoints: string[];
  definitions: NoteDefinition[];
  examples: string[];
  formulas: string[];
  sourcePages: number[];
}

export interface NotesResult {
  type: "notes";
  title: string;
  overview: string;
  sections: NoteSection[];
  keyTakeaways: string[];
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  topic: string;
  sourcePages: number[];
}

export interface FlashcardsResult {
  type: "flashcards";
  title: string;
  cards: Flashcard[];
}

// ---------------------------------------------------------------------------
// Questions & Answers
// ---------------------------------------------------------------------------

export type QuestionKind = "recall" | "conceptual" | "application" | "comparison" | "explanation";

export interface StudyQuestion {
  id: string;
  question: string;
  answer: string;
  difficulty: ItemDifficulty;
  kind: QuestionKind;
  topic: string;
  sourcePages: number[];
}

export interface QuestionsResult {
  type: "questions";
  title: string;
  questions: StudyQuestion[];
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: ItemDifficulty;
  topic: string;
  sourcePages: number[];
}

export interface QuizResult {
  type: "quiz";
  title: string;
  questions: QuizQuestion[];
}

// ---------------------------------------------------------------------------
// Combined
// ---------------------------------------------------------------------------

// A study pack is just the individual results together — keeping them as
// separate keyed results means adding a sixth mode later doesn't require
// reshaping anything that already exists.
export interface StudyPackResult {
  notes: NotesResult | null;
  flashcards: FlashcardsResult | null;
  questions: QuestionsResult | null;
  quiz: QuizResult | null;
}

export interface GenerateRequest {
  mode: StudyMode;
  detail: DetailLevel;
  difficulty: Difficulty;
  quantity: number;
  meta: Pick<PdfMeta, "fileName" | "pageCount" | "pageMappingReliable">;
  pages: PdfPage[];
  // Client-generated idempotency key — a double-submit with the same key is
  // rejected rather than billed twice.
  requestId: string;
  // Optional Firebase ID token. Verified server-side; an unverifiable token is
  // treated as anonymous rather than rejected.
  idToken?: string;
}

export interface GenerateResponse {
  results: StudyPackResult;
  usage: {
    used: number;
    limit: number;
    tier: "anonymous" | "authenticated";
  };
}

// The set of result tabs a given mode produces.
export function modesProduced(mode: StudyMode): Array<keyof StudyPackResult> {
  if (mode === "study-pack") return ["notes", "flashcards", "questions", "quiz"];
  if (mode === "notes") return ["notes"];
  if (mode === "flashcards") return ["flashcards"];
  if (mode === "questions") return ["questions"];
  return ["quiz"];
}
