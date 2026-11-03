/**
 * The free keyword field tool: cleans an App Store keyword list so it fits Apple's 100-character
 * field without wasting characters. Pure, so it runs in the browser and in tests.
 */

export const LIMITS = { name: 30, subtitle: 30, keywords: 100 } as const;

/** Characters as Apple counts them (code points, so 習慣 is 2 and an emoji is 1). */
export const charCount = (s: string) => [...s].length;

// letters and digits only, so "Streak: Habit Tracker" indexes "streak", not "streak:"
const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export type CleanResult = {
  /** Ready to paste: terms joined with commas and no spaces. */
  field: string;
  length: number;
  /** Terms dropped because they appeared earlier in the list. */
  duplicates: string[];
  /** Terms dropped because every word is already in the app name or subtitle. */
  inNameOrSubtitle: string[];
  /** Words used in more than one term. Apple combines words across terms, so each needs listing once. */
  repeatedWords: string[];
};

export function cleanKeywordField(raw: string, opts: { name?: string; subtitle?: string; singleWords?: boolean } = {}): CleanResult {
  const indexed = new Set([...words(opts.name ?? ""), ...words(opts.subtitle ?? "")]);
  const terms = raw
    .split(/[,\n،、，]+/u)
    .map((t) => t.trim().toLowerCase().replace(/\s+/gu, " "))
    .filter(Boolean);
  const candidates = opts.singleWords ? terms.flatMap((t) => t.split(" ")) : terms;

  const seen = new Set<string>();
  const kept: string[] = [];
  const duplicates: string[] = [];
  const inNameOrSubtitle: string[] = [];
  for (const t of candidates) {
    if (seen.has(t)) {
      if (!opts.singleWords) duplicates.push(t);
      continue;
    }
    seen.add(t);
    if (t.split(" ").every((w) => indexed.has(w))) inNameOrSubtitle.push(t);
    else kept.push(t);
  }

  const wordUses = new Map<string, number>();
  for (const t of kept) for (const w of new Set(t.split(" "))) wordUses.set(w, (wordUses.get(w) ?? 0) + 1);
  const repeatedWords = [...wordUses].filter(([, n]) => n > 1).map(([w]) => w);

  const field = kept.join(",");
  return { field, length: charCount(field), duplicates, inNameOrSubtitle, repeatedWords };
}
