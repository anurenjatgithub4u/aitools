// Text normalisation for read-aloud comparison.
//
// The job here is to remove differences that are NOT reading mistakes, so the
// alignment step only ever reports things the speaker actually got wrong.
//
// Speech recognition returns no punctuation, inconsistent capitalisation,
// digits instead of words (or the reverse), and expanded or contracted forms
// depending on the engine. None of those are pronunciation errors, and
// flagging them red would make the tool feel broken and unfair.

/** Filler sounds a speaker makes that aren't part of the passage. Stripped
 *  from the spoken side so they don't register as extra words. */
const FILLERS = new Set([
  "uh", "um", "erm", "hmm", "mhm", "uhh", "umm", "ah", "eh", "er", "hm", "mm",
]);

/** Contractions expand both ways during comparison, since engines differ on
 *  whether they return "don't" or "do not". */
const CONTRACTIONS: Record<string, string> = {
  "dont": "do not", "doesnt": "does not", "didnt": "did not",
  "cant": "can not", "cannot": "can not", "couldnt": "could not",
  "wont": "will not", "wouldnt": "would not", "shouldnt": "should not",
  "isnt": "is not", "arent": "are not", "wasnt": "was not", "werent": "were not",
  "hasnt": "has not", "havent": "have not", "hadnt": "had not",
  "im": "i am", "ive": "i have", "ill": "i will", "id": "i would",
  "youre": "you are", "youve": "you have", "youll": "you will",
  "hes": "he is", "shes": "she is", "its": "it is", "thats": "that is",
  "theyre": "they are", "theyve": "they have", "theyll": "they will",
  "were": "we are", "weve": "we have", "well": "we will",
  "lets": "let us", "theres": "there is", "heres": "here is",
};

/** Small numbers, so "5" and "five" compare equal. Beyond twenty the engines
 *  are consistent enough that a lookup isn't worth the size. */
const NUMBER_WORDS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
  "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
  "11": "eleven", "12": "twelve", "13": "thirteen", "14": "fourteen",
  "15": "fifteen", "16": "sixteen", "17": "seventeen", "18": "eighteen",
  "19": "nineteen", "20": "twenty", "30": "thirty", "40": "forty",
  "50": "fifty", "60": "sixty", "70": "seventy", "80": "eighty",
  "90": "ninety", "100": "hundred", "1000": "thousand",
};

/**
 * Homophone groups.
 *
 * Recognition genuinely cannot distinguish these from audio alone — "their"
 * and "there" are the same sound. Marking one red would blame the reader for
 * the engine's ambiguity, so these resolve to "uncertain" rather than wrong.
 */
const HOMOPHONE_GROUPS: string[][] = [
  ["to", "too", "two"],
  ["there", "their", "theyre"],
  ["your", "youre"],
  ["its", "it is"],
  ["hear", "here"],
  ["for", "four", "fore"],
  ["by", "buy", "bye"],
  ["no", "know"],
  ["new", "knew"],
  ["right", "write"],
  ["one", "won"],
  ["would", "wood"],
  ["weather", "whether"],
  ["through", "threw"],
  ["principal", "principle"],
  ["affect", "effect"],
];

const HOMOPHONE_KEY = new Map<string, number>();
HOMOPHONE_GROUPS.forEach((group, index) => {
  for (const word of group) HOMOPHONE_KEY.set(word, index);
});

/** Strips punctuation and casing from a single token. */
export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    // Curly quotes and dashes appear in passages but never in transcripts.
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    // Keep inner apostrophes and hyphens; drop everything else.
    .replace(/[^a-z0-9'\-]/g, "")
    .replace(/^[-']+|[-']+$/g, "")
    .trim();
}

/**
 * Splits text into comparable tokens.
 *
 * Contractions expand and digits become words, so both sides of the comparison
 * end up in the same vocabulary regardless of which engine produced them.
 */
export function tokenize(text: string, options: { stripFillers?: boolean } = {}): string[] {
  const words: string[] = [];

  for (const raw of text.split(/\s+/)) {
    const word = normalizeWord(raw);
    if (!word) continue;
    if (options.stripFillers && FILLERS.has(word)) continue;

    // Hyphenated compounds are read as separate words.
    for (const part of word.split("-").filter(Boolean)) {
      const bare = part.replace(/'/g, "");
      const expanded = CONTRACTIONS[bare];
      if (expanded) {
        words.push(...expanded.split(" "));
        continue;
      }
      const asWord = NUMBER_WORDS[part];
      words.push(asWord ?? part);
    }
  }

  return words;
}

/** Keeps the original spelling alongside its normalised form, so the UI can
 *  render the passage as written while comparing on the normalised token. */
export interface DisplayToken {
  /** Exactly as it appears in the passage, punctuation included. */
  raw: string;
  /** Normalised comparison form. Empty for pure punctuation. */
  normalized: string;
  /** Index into the normalised token stream, or -1 if not comparable. */
  compareIndex: number;
}

/**
 * Tokenises a passage for display, preserving the original text.
 *
 * A contraction expands to several comparison tokens but stays one visible
 * word, so `compareIndex` points at the first of them — that's enough to
 * colour the word, and avoids splitting "don't" across two spans on screen.
 */
export function tokenizeForDisplay(text: string): { tokens: DisplayToken[]; compareWords: string[] } {
  const tokens: DisplayToken[] = [];
  const compareWords: string[] = [];

  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const expanded = tokenize(raw);
    if (expanded.length === 0) {
      // Punctuation-only token — shown, never compared.
      tokens.push({ raw, normalized: "", compareIndex: -1 });
      continue;
    }
    tokens.push({ raw, normalized: expanded[0], compareIndex: compareWords.length });
    compareWords.push(...expanded);
  }

  return { tokens, compareWords };
}

/** True when two normalised words are homophones — indistinguishable by ear. */
export function areHomophones(a: string, b: string): boolean {
  if (a === b) return false;
  const groupA = HOMOPHONE_KEY.get(a);
  const groupB = HOMOPHONE_KEY.get(b);
  return groupA !== undefined && groupA === groupB;
}

/**
 * True for a near-miss: same word, different ending.
 *
 * "employee" for "employees", "introduce" for "introduced". These are the
 * single most common read-aloud slip and worth identifying specifically —
 * they're what lets the coach say "you're dropping word endings" instead of
 * just "you made mistakes".
 */
export function isEndingSlip(expected: string, spoken: string): boolean {
  if (expected === spoken) return false;
  const shorter = expected.length <= spoken.length ? expected : spoken;
  const longer = expected.length <= spoken.length ? spoken : expected;

  if (shorter.length < 3) return false;
  if (!longer.startsWith(shorter)) return false;

  // Only a short suffix difference counts — "read" vs "readjustment" is a
  // different word, not a dropped ending.
  const suffix = longer.slice(shorter.length);
  return suffix.length <= 3 && /^(s|es|d|ed|ing|ly|er|est|n)$/.test(suffix);
}

/** Levenshtein distance, used to spot a likely mispronunciation of the same
 *  word rather than an entirely different one. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/** Close enough that it's probably the same word said imprecisely. */
export function isNearWord(a: string, b: string): boolean {
  if (a === b) return false;
  const longest = Math.max(a.length, b.length);
  if (longest < 4) return false;
  const distance = editDistance(a, b);
  return distance <= (longest >= 8 ? 2 : 1);
}

export { FILLERS };
