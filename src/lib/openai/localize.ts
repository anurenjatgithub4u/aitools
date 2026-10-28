import "server-only";
import { z } from "zod";
import { getCountry, type CountryCode } from "@/lib/countries";
import { generateStructured } from "./structured";

/** Builds the output schema for one batch; the refinement makes a missing or unknown id fail (and retry). */
export function localizeOutput(ids: number[]) {
  const want = new Set(ids);
  return z
    .object({
      items: z.array(
        z.object({
          id: z.number().int(),
          phrase: z.string().min(1).max(100).describe("What locals type into App Store search, in the local language"),
          note: z.string().nullable().describe("Short English note when the phrase differs a lot from a literal translation, else null"),
        }),
      ),
    })
    .refine((o) => o.items.length === want.size && o.items.every((i) => want.has(i.id)), {
      message: `return exactly one item for each id: ${ids.join(", ")}`,
    });
}

function instructions(country: CountryCode) {
  const c = getCountry(country);
  return `You are an App Store Optimization (ASO) expert for the ${c.name} App Store.
For each English keyword, write the phrase people in ${c.name} actually type into App Store search when they want that thing, in ${c.languageName}.
Rules:
- Natural local search wording, not a literal translation. Prefer the common everyday term (including English loanwords or katakana if that is what locals search).
- Keep it short like a real search query, lowercase where the language uses case.
- Keep the same intent and roughly the same specificity as the English keyword.
- For English-speaking countries use the regional vocabulary and spelling (e.g. UK "football", "colour").
- Return the given id with each phrase.`;
}

/** Localizes up to ~30 keywords for one country in a single model call. US English is returned as-is. */
export async function localizeKeywords(
  country: CountryCode,
  keywords: { id: number; term: string }[],
): Promise<{ keywordId: number; phrase: string; note: string | null }[]> {
  if (country === "US") return keywords.map((k) => ({ keywordId: k.id, phrase: k.term, note: null }));
  if (!keywords.length) return [];
  const out = await generateStructured({
    schema: localizeOutput(keywords.map((k) => k.id)),
    name: "localized_keywords",
    instructions: instructions(country),
    input: keywords.map((k) => `${k.id}: ${k.term}`).join("\n"),
  });
  return out.items.map((i) => ({ keywordId: i.id, phrase: i.phrase.trim(), note: i.note?.trim() || null }));
}
