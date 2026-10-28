import "server-only";
import { z } from "zod";
import type { KeywordKind } from "@/types";
import { generateStructured } from "./structured";

export const BRAINSTORM_COUNT = 30;

// What the model must return. Array length is checked by the refinement (not sent to the model as a
// JSON-schema bound), so a short list fails validation and triggers the one retry.
export const BrainstormOutput = z
  .object({
    keywords: z.array(
      z.object({
        term: z.string().describe("Lowercase App Store search phrase, no brand names, no punctuation"),
        kind: z.enum(["short", "long"]).describe("short = 1-2 words, long = 3-5 words"),
      }),
    ),
  })
  .refine((o) => normalizeKeywords(o.keywords).length >= BRAINSTORM_COUNT * 0.8, {
    message: `need about ${BRAINSTORM_COUNT} distinct keywords`,
  });

const INSTRUCTIONS = `You are an App Store Optimization (ASO) expert for the Apple App Store.
Suggest search keywords real users type into App Store search to find an app like the one described.
Rules:
- Exactly ${BRAINSTORM_COUNT} keywords, all distinct, lowercase, US English.
- Mix: about 12 short-tail (1-2 words, broad, high traffic) and about 18 long-tail (3-5 words, specific intent).
- Use phrases people actually search, not marketing copy. No competitor brand names, no "app" suffix unless people really search it that way.
- Cover features, problems solved, use cases and audience.`;

/** Trims, lowercases, de-duplicates and caps the list; kind is corrected from the word count. */
export function normalizeKeywords(items: { term: string; kind: KeywordKind }[]): { term: string; kind: KeywordKind }[] {
  const seen = new Set<string>();
  const out: { term: string; kind: KeywordKind }[] = [];
  for (const { term } of items) {
    const t = term.toLowerCase().replace(/\s+/g, " ").trim();
    if (!t || t.length > 100 || seen.has(t)) continue;
    seen.add(t);
    out.push({ term: t, kind: t.split(" ").length <= 2 ? "short" : "long" });
  }
  return out.slice(0, BRAINSTORM_COUNT);
}

export async function brainstormKeywords(input: { name: string; description: string; audience?: string }) {
  const out = await generateStructured({
    schema: BrainstormOutput,
    name: "keywords",
    instructions: INSTRUCTIONS,
    input: [`App name: ${input.name}`, `Description / niche: ${input.description}`, input.audience && `Target audience: ${input.audience}`]
      .filter(Boolean)
      .join("\n"),
  });
  return normalizeKeywords(out.keywords);
}
