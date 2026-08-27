// Pure formatters for copy/download. No DOM and no server dependencies, so
// these are safe to import from client components and easy to reason about.

import type {
  FlashcardsResult,
  NotesResult,
  QuestionsResult,
  QuizResult,
  StudyPackResult,
} from "./types";

// ---------------------------------------------------------------------------
// File naming
// ---------------------------------------------------------------------------

/**
 * Turns an uploaded filename into a safe download basename.
 * Strips directory separators, control characters and anything a filesystem
 * (or a Content-Disposition header) could misread.
 */
export function safeBaseName(fileName: string): string {
  const withoutExt = fileName.replace(/\.pdf$/i, "");
  const cleaned = withoutExt
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[/\\?%*:|"<>.]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return cleaned || "study-material";
}

export function downloadFileName(fileName: string, suffix: string, ext: string): string {
  return `${safeBaseName(fileName)}-${suffix}.${ext}`;
}

// ---------------------------------------------------------------------------
// Markdown / text
// ---------------------------------------------------------------------------

function pageRef(pages: number[]): string {
  if (!pages.length) return "";
  if (pages.length === 1) return ` _(Source: page ${pages[0]})_`;
  const consecutive = pages.every((p, i) => i === 0 || p === pages[i - 1] + 1);
  return consecutive
    ? ` _(Source: pages ${pages[0]}–${pages[pages.length - 1]})_`
    : ` _(Source: pages ${pages.join(", ")})_`;
}

export function notesToMarkdown(notes: NotesResult): string {
  const out: string[] = [`# ${notes.title}`];

  if (notes.overview) out.push(`## Overview\n\n${notes.overview}`);

  for (const section of notes.sections) {
    out.push(`## ${section.title}${pageRef(section.sourcePages)}`);
    if (section.summary) out.push(section.summary);
    if (section.keyPoints.length) {
      out.push(`### Key points\n\n${section.keyPoints.map((p) => `- ${p}`).join("\n")}`);
    }
    if (section.definitions.length) {
      out.push(
        `### Important terms\n\n${section.definitions
          .map((d) => `**${d.term}** — ${d.definition}`)
          .join("\n\n")}`
      );
    }
    if (section.formulas.length) {
      out.push(`### Formulas\n\n${section.formulas.map((f) => `- \`${f}\``).join("\n")}`);
    }
    if (section.examples.length) {
      out.push(`### Examples\n\n${section.examples.map((e) => `- ${e}`).join("\n")}`);
    }
  }

  if (notes.keyTakeaways.length) {
    out.push(`## Key takeaways\n\n${notes.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join("\n")}`);
  }

  return out.join("\n\n");
}

export function flashcardsToMarkdown(cards: FlashcardsResult): string {
  const body = cards.cards
    .map((c, i) => `### ${i + 1}. ${c.question}${pageRef(c.sourcePages)}\n\n${c.answer}`)
    .join("\n\n");
  return `# ${cards.title} — Flashcards\n\n${body}`;
}

/** RFC 4180 CSV — importable into Anki, Quizlet and spreadsheets. */
export function flashcardsToCsv(cards: FlashcardsResult): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["Question", "Answer", "Topic", "Source pages"].map(escape).join(","),
    ...cards.cards.map((c) =>
      [c.question, c.answer, c.topic, c.sourcePages.join(" ")].map(escape).join(",")
    ),
  ];
  return rows.join("\r\n");
}

export function questionsToMarkdown(questions: QuestionsResult): string {
  const body = questions.questions
    .map(
      (q, i) =>
        `### ${i + 1}. ${q.question}${pageRef(q.sourcePages)}\n\n_${q.difficulty} · ${q.kind}${
          q.topic ? ` · ${q.topic}` : ""
        }_\n\n${q.answer}`
    )
    .join("\n\n");
  return `# ${questions.title} — Questions & Answers\n\n${body}`;
}

export function quizToMarkdown(quiz: QuizResult): string {
  const body = quiz.questions
    .map((q, i) => {
      const options = q.options
        .map((opt, oi) => `${String.fromCharCode(65 + oi)}. ${opt}`)
        .join("\n");
      const answer = `**Answer: ${String.fromCharCode(65 + q.correctAnswer)}.** ${
        q.options[q.correctAnswer]
      }`;
      return `### ${i + 1}. ${q.question}${pageRef(q.sourcePages)}\n\n${options}\n\n${answer}${
        q.explanation ? `\n\n${q.explanation}` : ""
      }`;
    })
    .join("\n\n");
  return `# ${quiz.title} — Quiz\n\n${body}`;
}

export function studyPackToMarkdown(pack: StudyPackResult): string {
  const parts: string[] = [];
  if (pack.notes) parts.push(notesToMarkdown(pack.notes));
  if (pack.flashcards) parts.push(flashcardsToMarkdown(pack.flashcards));
  if (pack.questions) parts.push(questionsToMarkdown(pack.questions));
  if (pack.quiz) parts.push(quizToMarkdown(pack.quiz));
  return parts.join("\n\n---\n\n");
}

/** Markdown stripped back to plain text for .txt downloads and clipboard copy. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

export function downloadText(content: string, fileName: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Freed on the next tick so the download has started before the URL is revoked.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
