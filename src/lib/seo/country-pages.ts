import { type CountryCode, getCountry } from "@/lib/countries";

/**
 * Content for the public /aso/<country> landing pages. Each page targets a low-competition search
 * like "app store keyword research Germany" or "ASO Japan", which the big ASO tools don't have
 * dedicated pages for.
 *
 * Examples show how the wording changes per storefront; they are not volume claims.
 */
export type CountryPage = {
  code: CountryCode;
  slug: string;
  /** What people search, e.g. "ASO for Germany". Used in the title and the h1. */
  heading: string;
  intro: string;
  examples: { english: string; local: string; note?: string }[];
  tips: string[];
};

export const COUNTRY_PAGES: CountryPage[] = [
  {
    code: "US",
    slug: "united-states",
    heading: "App Store Keyword Research for the US",
    intro:
      "The US App Store is the biggest and the most crowded. Short head terms like \"budget\" or \"workout\" are owned by apps with hundreds of thousands of ratings, so new apps win here with longer, more specific phrases.",
    examples: [
      { english: "budget", local: "budget planner for couples", note: "specific beats short" },
      { english: "workout", local: "home workout no equipment" },
      { english: "habit tracker", local: "habit tracker" },
      { english: "to-do list", local: "to do list widget" },
      { english: "soccer", local: "soccer scores", note: "\"football\" means American football here" },
    ],
    tips: [
      "Go long-tail first: three- and four-word phrases where the top apps have a few hundred ratings, not a few hundred thousand.",
      "Use US spelling (\"color\", \"organizer\"). The UK storefront has its own keyword field for British spelling.",
      "Check the top 5 results before committing a keyword: if they're all household names, it's a later target, not a first one.",
    ],
  },
  {
    code: "UK",
    slug: "united-kingdom",
    heading: "App Store Keyword Research for the UK",
    intro:
      "Same language, different words. British users search with British spelling and vocabulary, and the UK storefront has its own title, subtitle and keyword field, so a copy of your US metadata leaves easy wins on the table.",
    examples: [
      { english: "soccer scores", local: "football scores" },
      { english: "vacation planner", local: "holiday planner" },
      { english: "math tutor", local: "maths tutor" },
      { english: "color by number", local: "colour by number" },
      { english: "personalized workout", local: "personalised workout" },
    ],
    tips: [
      "Swap US spelling and vocabulary for British: -our, -ise, \"mum\", \"holiday\", \"maths\", \"football\".",
      "Competition is lower than the US for the same phrase, so terms that are hopeless in the US can be realistic here.",
      "Your UK keyword field is separate from the US one: use it for the British variants instead of repeating US words.",
    ],
  },
  {
    code: "DE",
    slug: "germany",
    heading: "App Store Keyword Research for Germany",
    intro:
      "German users search in German, and German joins words together. \"Habit tracker\" becomes one word, gewohnheitstracker, so a keyword list translated word by word misses the phrases people actually type.",
    examples: [
      { english: "habit tracker", local: "gewohnheitstracker", note: "one compound word" },
      { english: "budget app", local: "haushaltsbuch" },
      { english: "weather", local: "wetter" },
      { english: "recipes", local: "rezepte" },
      { english: "to-do list", local: "aufgabenliste" },
    ],
    tips: [
      "Check both the compound word and the split version (\"gewohnheiten tracker\"): they rank differently.",
      "Some English words are used as-is (\"tracker\", \"meditation\", \"podcast\"). Keep them where Germans use them.",
      "German words are long, so the 100-character keyword field fills fast: put the longest compounds in your title or subtitle instead.",
    ],
  },
  {
    code: "FR",
    slug: "france",
    heading: "App Store Keyword Research for France",
    intro:
      "French users mostly search in French, even for categories where English loanwords exist. Many apps reuse their English keywords in France, which leaves the French phrases less contested.",
    examples: [
      { english: "habit tracker", local: "suivi d'habitudes" },
      { english: "weather", local: "météo" },
      { english: "recipes", local: "recettes" },
      { english: "budget app", local: "gestion budget" },
      { english: "workout", local: "musculation", note: "for strength training" },
    ],
    tips: [
      "Drop articles like \"de\", \"la\" and \"les\" in the keyword field; they waste characters.",
      "Write keywords with their proper accents (\"météo\", \"séance\"): that's how French users type them.",
      "Look at which words the top French apps use in their titles: they show what users respond to.",
    ],
  },
  {
    code: "ES",
    slug: "spain",
    heading: "App Store Keyword Research for Spain",
    intro:
      "Spain's Spanish is not Latin American Spanish. Spaniards say \"el tiempo\" for weather where Latin Americans say \"clima\", and a keyword list written for Mexico misses phrases people in Spain use.",
    examples: [
      { english: "weather", local: "el tiempo", note: "not \"clima\"" },
      { english: "habit tracker", local: "seguimiento de hábitos" },
      { english: "expense tracker", local: "control de gastos" },
      { english: "recipes", local: "recetas" },
      { english: "home workout", local: "entrenamiento en casa" },
    ],
    tips: [
      "Write for Spain, not \"neutral Spanish\": vocabulary differs (\"móvil\", not \"celular\").",
      "Spain is a smaller storefront, so the same keyword is usually much less contested than in the US.",
      "Skip connector words like \"de\" and \"en\" in the keyword field; Apple combines words across your fields.",
    ],
  },
  {
    code: "IT",
    slug: "italy",
    heading: "App Store Keyword Research for Italy",
    intro:
      "Italian users search in Italian, often with short, direct phrases, and mix in English for some tech words. Fewer apps localize for Italy, which makes it a good place to rank early.",
    examples: [
      { english: "habit tracker", local: "tracker abitudini", note: "English + Italian mix" },
      { english: "weather", local: "meteo" },
      { english: "recipes", local: "ricette" },
      { english: "expense tracker", local: "gestione spese" },
      { english: "home workout", local: "allenamento a casa" },
    ],
    tips: [
      "Test both the Italian phrase and the English loanword: for some categories Italians search the English one.",
      "Leave out \"di\", \"per\" and other short connectors in the keyword field.",
      "With less competition, mid-length phrases can rank within weeks of an update.",
    ],
  },
  {
    code: "JP",
    slug: "japan",
    heading: "App Store Keyword Research for Japan",
    intro:
      "Japan is one of the highest-earning App Stores, and Japanese searches mix three scripts: kanji, hiragana and katakana. The phrase people type is often a native term, like 家計簿 (household account book) for a budget app.",
    examples: [
      { english: "habit tracker", local: "習慣管理" },
      { english: "budget app", local: "家計簿" },
      { english: "weather", local: "天気" },
      { english: "recipes", local: "レシピ", note: "katakana loanword" },
      { english: "workout", local: "筋トレ", note: "short for 筋力トレーニング" },
    ],
    tips: [
      "Japanese packs a lot into few characters, so the 100-character keyword field holds many more keywords than in English.",
      "Check kanji, hiragana and katakana versions of the same word: they can rank differently.",
      "Native terms like 家計簿 usually beat transliterated English, so start from what Japanese apps call themselves.",
    ],
  },
  {
    code: "BR",
    slug: "brazil",
    heading: "App Store Keyword Research for Brazil",
    intro:
      "Brazil is a large, fast-growing App Store where people search in Brazilian Portuguese, which differs from European Portuguese. Many global apps never localize for Brazil, so local phrases are often open.",
    examples: [
      { english: "habit tracker", local: "rastreador de hábitos" },
      { english: "weather", local: "previsão do tempo" },
      { english: "expense tracker", local: "controle de gastos" },
      { english: "recipes", local: "receitas" },
      { english: "home workout", local: "treino em casa" },
    ],
    tips: [
      "Write in Brazilian Portuguese (\"celular\", \"ônibus\"), not European Portuguese.",
      "Short connectors (\"de\", \"em\", \"do\") don't need space in the keyword field.",
      "Brazil gets lots of ratings for its size, so check the top apps' rating counts before assuming a phrase is easy.",
    ],
  },
  {
    code: "IN",
    slug: "india",
    heading: "App Store Keyword Research for India",
    intro:
      "Most iPhone users in India search in English, but with Indian vocabulary, and some type Hindi words in English letters, like \"rashifal\" for horoscope. Global apps rarely target these phrases.",
    examples: [
      { english: "soccer scores", local: "cricket score", note: "cricket dominates sports search" },
      { english: "horoscope", local: "rashifal", note: "Hindi in English letters" },
      { english: "budget app", local: "expense tracker" },
      { english: "train tickets", local: "train ticket booking" },
      { english: "recipes", local: "indian recipes" },
    ],
    tips: [
      "Use Indian English vocabulary and local context (cricket, UPI, festivals) rather than US terms.",
      "Try Hindi words written in English letters for categories with strong local tradition.",
      "Competition varies a lot: India-specific categories can be crowded with local apps, so always check the top 5.",
    ],
  },
];

const bySlug = new Map(COUNTRY_PAGES.map((p) => [p.slug, p]));

export const getCountryPage = (slug: string) => bySlug.get(slug);

export const countryPagePath = (p: CountryPage) => `/aso/${p.slug}`;

/** "Apps get about 9% as many ratings here as in the US": from the measured storefront sizes. */
export function storefrontSizeNote(code: CountryCode): string | null {
  const share = getCountry(code).ratingShare;
  if (share >= 1) return null;
  const pct = Math.round(share * 100);
  const usEquivalent = Math.round(1000 / share / 100) * 100;
  return `An app gets about ${pct}% as many ratings in ${getCountry(code).name} as it does in the US. So when the top apps for a keyword have 1,000 ratings here, it's about as competitive as a US keyword whose top apps have ${usEquivalent.toLocaleString("en-US")}.`;
}
