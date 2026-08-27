// Prompt templates (spec §11, §15, §22, §23).
//
// One rule runs through all of them: the model may explain and organise what
// the transcript contains, but may never supply facts the transcript doesn't.
// A video summary that quietly invents a definition is worse than no summary,
// because the user has no way to spot it.

import type { ContentType, KnowledgeRepresentation, TranscriptChunk } from "./types";
import { stamp } from "./chunk";

/** Prepended to every extraction call. */
export const GROUNDING_RULES = `
GROUNDING RULES — these override any other instruction:
- Base every factual claim on the provided transcript. Do not add information
  from your own knowledge, even if you are confident it is correct.
- If the transcript is unclear or does not cover something, say so. Use the
  exact phrase "not covered in the video" rather than filling the gap.
- Attribute opinions to the speaker ("the speaker argues...") rather than
  stating them as fact.
- Never invent statistics, names, dates, tool names, or citations.
- Preserve the speaker's meaning even where you compress the wording.
`.trim();

// ---------------------------------------------------------------------------
// Content classification (spec §11) — runs on the fast model tier
// ---------------------------------------------------------------------------

export function classificationPrompt(title: string, channel: string, sample: string): string {
  return `Classify this YouTube video from its title and a transcript sample.

Title: ${title}
Channel: ${channel}

Transcript sample:
"""
${sample.slice(0, 6000)}
"""

Choose exactly one content type:
EDUCATIONAL, TUTORIAL, LECTURE, PODCAST, INTERVIEW, NEWS, TECHNICAL,
BUSINESS, SELF_HELP, ENTERTAINMENT, MUSIC, OTHER

Also judge whether the video carries enough spoken, informational content to
support structured study notes. Music videos, ambient content and pure
entertainment usually do not.

Return JSON only:
{
  "content_type": "TUTORIAL",
  "confidence": 0.0-1.0,
  "low_information": false,
  "reason": "one short sentence"
}`;
}

// ---------------------------------------------------------------------------
// Knowledge extraction (spec §15) — the intermediate representation
// ---------------------------------------------------------------------------

/** What each content type should emphasise when extracting (spec §11). */
const FOCUS_BY_TYPE: Record<ContentType, string> = {
  TUTORIAL: "concrete steps, commands, configuration, techniques, and the order things must happen in",
  TECHNICAL: "concepts, architecture, trade-offs, technical terms, and any code or commands mentioned",
  LECTURE: "concepts, definitions, explanations, and the points the lecturer stresses",
  EDUCATIONAL: "concepts, explanations, worked examples, and takeaways",
  PODCAST: "main ideas, arguments, opinions, stories, and conclusions",
  INTERVIEW: "the questions asked, the answers given, and the interviewee's distinctive insights",
  NEWS: "what happened, who is involved, the stated facts, and the framing",
  BUSINESS: "strategies, frameworks, numbers actually cited, and recommended actions",
  SELF_HELP: "the central advice, the reasoning behind it, and the practical actions suggested",
  ENTERTAINMENT: "the main subjects discussed and any factual content present",
  MUSIC: "any spoken content — note explicitly if the video is primarily music",
  OTHER: "main topics, key points, and anything the speaker emphasises",
};

export function chunkExtractionPrompt(
  chunk: TranscriptChunk,
  renderedText: string,
  contentType: ContentType,
  title: string
): string {
  return `${GROUNDING_RULES}

You are extracting structured knowledge from part of a YouTube video transcript.

Video: ${title}
Content type: ${contentType}
This section covers ${stamp(chunk.startSeconds)} to ${stamp(chunk.endSeconds)}.

For this content type, focus on: ${FOCUS_BY_TYPE[contentType]}.

Timestamps appear inline as [m:ss]. When you record an item, set "at" to the
number of SECONDS of the nearest preceding timestamp. Use null if you cannot
place it.

Transcript section:
"""
${renderedText}
"""

Return JSON only, using this exact shape. Omit nothing; use empty arrays where
the section genuinely contains nothing of that kind:
{
  "main_topics": ["short topic label"],
  "key_concepts": [{"text": "concept explained in one or two sentences", "at": 320}],
  "definitions": [{"term": "...", "definition": "...", "at": 412}],
  "examples": [{"text": "...", "at": 500}],
  "steps": [{"order": 1, "instruction": "...", "detail": "...", "at": 610}],
  "important_quotes": [{"text": "verbatim quote from the transcript", "at": 700}],
  "claims": [{"text": "an assertion the speaker makes", "at": 800}],
  "tools": ["named tools, libraries or products actually mentioned"],
  "resources": ["books, papers, links or references actually mentioned"],
  "action_items": ["something the viewer is told to do"],
  "chapters": [{"title": "topic shift label", "at": 0}]
}`;
}

/** Merges per-chunk extractions into one representation (map-reduce step). */
export function mergePrompt(title: string, contentType: ContentType, partials: string): string {
  return `${GROUNDING_RULES}

You are consolidating structured extractions from consecutive sections of one
YouTube video into a single knowledge representation.

Video: ${title}
Content type: ${contentType}

Section extractions:
"""
${partials}
"""

Consolidate them:
- Merge duplicate concepts and definitions, keeping the clearest wording and
  the EARLIEST timestamp.
- Keep steps in their original order and renumber them from 1.
- Order chapters by timestamp.
- Keep at most 12 key concepts, 10 definitions, 8 examples, 6 quotes and
  10 claims — choose by importance to the video's argument, not by position.
- In "gaps", list anything the video referenced but did not explain. Leave the
  array empty if there is nothing.

Write "overview" as one paragraph orienting a reader who has not watched the
video. Ground it entirely in the extractions above.

Return JSON only:
{
  "overview": "one paragraph",
  "main_topics": ["..."],
  "key_concepts": [{"text": "...", "at": 320}],
  "definitions": [{"term": "...", "definition": "...", "at": 412}],
  "examples": [{"text": "...", "at": 500}],
  "steps": [{"order": 1, "instruction": "...", "detail": "...", "at": 610}],
  "important_quotes": [{"text": "...", "at": 700}],
  "claims": [{"text": "...", "at": 800}],
  "tools": ["..."],
  "resources": ["..."],
  "action_items": ["..."],
  "chapters": [{"title": "...", "at": 0}],
  "gaps": ["..."]
}`;
}

// ---------------------------------------------------------------------------
// Output generation (spec §13) — all from the cached representation, never
// from the raw transcript again (spec §18)
// ---------------------------------------------------------------------------

/** Compact serialisation of the knowledge representation for output prompts. */
export function serializeKnowledge(kr: KnowledgeRepresentation): string {
  const at = (n: number | null) => (n === null ? "" : ` [${stamp(n)}]`);
  const lines: string[] = [];

  lines.push(`TITLE: ${kr.title}`);
  lines.push(`TYPE: ${kr.contentType}`);
  lines.push(`OVERVIEW: ${kr.overview}`);

  if (kr.mainTopics.length) lines.push(`TOPICS: ${kr.mainTopics.join(" · ")}`);

  if (kr.keyConcepts.length) {
    lines.push("\nKEY CONCEPTS:");
    kr.keyConcepts.forEach((c) => lines.push(`- ${c.text}${at(c.at)}`));
  }
  if (kr.definitions.length) {
    lines.push("\nDEFINITIONS:");
    kr.definitions.forEach((d) => lines.push(`- ${d.term}: ${d.definition}${at(d.at)}`));
  }
  if (kr.steps.length) {
    lines.push("\nSTEPS:");
    kr.steps.forEach((s) => lines.push(`${s.order}. ${s.instruction} — ${s.detail}${at(s.at)}`));
  }
  if (kr.examples.length) {
    lines.push("\nEXAMPLES:");
    kr.examples.forEach((e) => lines.push(`- ${e.text}${at(e.at)}`));
  }
  if (kr.claims.length) {
    lines.push("\nCLAIMS MADE BY THE SPEAKER:");
    kr.claims.forEach((c) => lines.push(`- ${c.text}${at(c.at)}`));
  }
  if (kr.importantQuotes.length) {
    lines.push("\nQUOTES:");
    kr.importantQuotes.forEach((q) => lines.push(`- "${q.text}"${at(q.at)}`));
  }
  if (kr.tools.length) lines.push(`\nTOOLS MENTIONED: ${kr.tools.join(", ")}`);
  if (kr.resources.length) lines.push(`RESOURCES MENTIONED: ${kr.resources.join(", ")}`);
  if (kr.actionItems.length) {
    lines.push("\nACTION ITEMS:");
    kr.actionItems.forEach((a) => lines.push(`- ${a}`));
  }
  if (kr.timestamps.length) {
    lines.push("\nCHAPTERS:");
    kr.timestamps.forEach((t) => lines.push(`- ${stamp(t.at)} ${t.title}`));
  }
  if (kr.gaps.length) {
    lines.push("\nNOT EXPLAINED IN THE VIDEO:");
    kr.gaps.forEach((g) => lines.push(`- ${g}`));
  }

  return lines.join("\n");
}

export function smartNotesPrompt(kr: KnowledgeRepresentation): string {
  return `${GROUNDING_RULES}

Write structured study notes from the extracted knowledge below. Everything
you write must come from it — do not add outside information.

${serializeKnowledge(kr)}

Format as Markdown:
- Open with a two-sentence summary of what the video covers.
- Use "## " headings following the video's own structure.
- Put a timestamp in square brackets after a heading when one is available,
  e.g. "## CAP Theorem [14:20]".
- Use short paragraphs and bullets. Bold genuinely important terms.
- Add a "## Key Terms" section if there are definitions.
- Add a "## Worth Remembering" section at the end with the 3-5 most useful points.
- If the extraction lists anything under "not explained in the video", add a
  short "## Not Covered" section noting it.

Return Markdown only. No preamble, no closing commentary.`;
}

export function studyGuidePrompt(kr: KnowledgeRepresentation): string {
  return `${GROUNDING_RULES}

Write a study guide from the extracted knowledge below. It should let someone
learn and then test themselves without rewatching the video.

${serializeKnowledge(kr)}

Format as Markdown with these sections:
1. "## What You'll Learn" — 3-5 concrete learning outcomes.
2. "## Core Concepts" — each concept with a plain-English explanation, its
   timestamp where available, and why it matters.
3. "## Key Terms" — a Markdown table with columns Term | Meaning.
4. "## Worked Examples" — only if the video contained examples.
5. "## Step-by-Step" — only if the video described a process.
6. "## Check Your Understanding" — 5-8 questions answerable from this guide,
   ordered easy to hard. Put answers in a "## Answers" section at the end.
7. "## Where to Go Deeper" — only list resources the video actually mentioned.

Explanations may be clearer than the speaker's wording, but must not introduce
facts the video did not state.

Return Markdown only.`;
}

export function chatgptPromptPrompt(kr: KnowledgeRepresentation): string {
  return `You are writing a prompt that a person will paste into ChatGPT to be
taught this video's subject.

Extracted knowledge:
${serializeKnowledge(kr)}

Produce a ready-to-paste prompt that:
- Casts ChatGPT as an expert tutor for this specific subject.
- Embeds the knowledge compactly, so ChatGPT has the material without needing
  the video.
- Instructs it to teach step by step, check understanding with questions, give
  practical examples, and not assume prior knowledge.
- Tells it to distinguish between what came from the video and what it is
  adding, and to say so plainly when the supplied material doesn't cover
  something.
- Plays to ChatGPT's strengths: interactive back-and-forth, structured
  exercises, and iterative practice.

Return only the prompt text — no explanation, no code fences, nothing the user
would have to delete before pasting.`;
}

export function claudePromptPrompt(kr: KnowledgeRepresentation): string {
  return `You are writing a prompt that a person will paste into Claude to be
taught this video's subject.

Extracted knowledge:
${serializeKnowledge(kr)}

Produce a ready-to-paste prompt that:
- Casts Claude as an expert tutor for this specific subject.
- Embeds the knowledge compactly, so Claude has the material without the video.
- Plays to Claude's strengths: long-context synthesis, structured explanation,
  connecting ideas across a whole body of material, and careful reasoning about
  trade-offs.
- Instructs it to explain thoroughly, relate concepts to each other, surface
  what the material leaves unresolved, and ask clarifying questions.
- Tells it to separate source-derived claims from its own additions, and to say
  "the source material doesn't cover this" rather than speculating.

Return only the prompt text — no explanation, no code fences.`;
}
