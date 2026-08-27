// Output generation from cached knowledge (spec §13, §18, §22, §24).
//
// Nothing here touches the transcript. Every output is produced from the
// knowledge representation, which is what makes switching from Notes to Study
// Guide cheap: one model call on an already-compact input, no re-download, no
// re-chunking, no re-extraction.

import { callAI } from "@/lib/ai";
import type { GeneratedOutput, KnowledgeRepresentation, OutputType } from "./types";
import { MVP_OUTPUT_TYPES } from "./config";
import {
  chatgptPromptPrompt,
  claudePromptPrompt,
  smartNotesPrompt,
  studyGuidePrompt,
} from "./prompts";
import { stamp } from "./chunk";
import { timestampUrl } from "./url";

export function isMvpOutput(value: string): value is OutputType {
  return (MVP_OUTPUT_TYPES as readonly string[]).includes(value);
}

/** Strips stray code fences a model may wrap around prose output. */
function unfence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
}

/**
 * Turns bare [m:ss] markers into links back into the video (spec §24).
 *
 * Only rewrites markers that parse to a time within the video's duration —
 * a model occasionally emits a plausible-looking stamp for a moment that
 * doesn't exist, and a link to nowhere is worse than plain text.
 */
export function linkifyTimestamps(
  markdown: string,
  videoId: string,
  durationSeconds: number
): string {
  return markdown.replace(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g, (match, a, b, c) => {
    const parts = c === undefined ? [Number(a), Number(b)] : [Number(a), Number(b), Number(c)];
    const total =
      parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];

    if (!Number.isFinite(total) || total > durationSeconds) return match;
    return `[${stamp(total)}](${timestampUrl(videoId, total)})`;
  });
}

export interface GenerateOptions {
  videoId: string;
  durationSeconds: number;
}

/**
 * Generates one output type from a knowledge representation.
 *
 * Uses the strong model tier throughout: this is the artefact the user reads,
 * and it runs once per output rather than once per chunk, so it is the right
 * place to spend (spec §16).
 */
export async function generateOutput(
  outputType: OutputType,
  knowledge: KnowledgeRepresentation,
  options: GenerateOptions
): Promise<GeneratedOutput> {
  const generatedAt = new Date().toISOString();

  switch (outputType) {
    case "smart-notes": {
      const raw = await callAI(smartNotesPrompt(knowledge), { json: false, tier: "strong", retries: 2 });
      return {
        outputType,
        content: linkifyTimestamps(unfence(raw), options.videoId, options.durationSeconds),
        generatedAt,
      };
    }

    case "study-guide": {
      const raw = await callAI(studyGuidePrompt(knowledge), { json: false, tier: "strong", retries: 2 });
      return {
        outputType,
        content: linkifyTimestamps(unfence(raw), options.videoId, options.durationSeconds),
        generatedAt,
      };
    }

    case "chatgpt-prompt": {
      const raw = await callAI(chatgptPromptPrompt(knowledge), { json: false, tier: "strong", retries: 2 });
      // Prompts are meant to be copied verbatim into another tool, so
      // timestamps stay as plain text — markdown links would be noise there.
      return { outputType, content: unfence(raw), targetModel: "chatgpt", generatedAt };
    }

    case "claude-prompt": {
      const raw = await callAI(claudePromptPrompt(knowledge), { json: false, tier: "strong", retries: 2 });
      return { outputType, content: unfence(raw), targetModel: "claude", generatedAt };
    }

    default:
      // key-takeaways, quiz, flashcards and playbook are designed for but not
      // built (spec §34). Failing loudly beats silently returning notes.
      throw new Error(`Output type "${outputType}" is not available yet`);
  }
}

/** Human-readable labels for the UI and for saved-item titles. */
export const OUTPUT_LABELS: Record<OutputType, string> = {
  "smart-notes": "Smart Notes",
  "study-guide": "Study Guide",
  "chatgpt-prompt": "ChatGPT Prompt",
  "claude-prompt": "Claude Prompt",
  "key-takeaways": "Key Takeaways",
  quiz: "Quiz",
  flashcards: "Flashcards",
  playbook: "Playbook",
};

export const OUTPUT_DESCRIPTIONS: Record<OutputType, string> = {
  "smart-notes": "Turn the video into structured, easy-to-read notes.",
  "study-guide": "Create concepts, explanations, examples, and review questions.",
  "chatgpt-prompt": "Create a ready-to-use prompt optimised for ChatGPT.",
  "claude-prompt": "Create a ready-to-use prompt optimised for Claude.",
  "key-takeaways": "Extract the most important ideas.",
  quiz: "Generate questions to test your understanding.",
  flashcards: "Turn important concepts into flashcards.",
  playbook: "Turn this video into a reusable FindUrAI workflow.",
};
