export type Country = {
  /** Code shown in the UI and stored in the DB. */
  code: string;
  /** Storefront code Apple's iTunes Search API expects (ISO 3166-1, so the UK is "gb"). */
  store: string;
  name: string;
  flag: string;
  /** BCP 47 tag of the language people search in on that storefront. */
  language: string;
  languageName: string;
  /**
   * How many ratings an app gets in this storefront relative to the US (US = 1). Rating counts are
   * per storefront, so scoring divides by this to compare countries on a US-equivalent scale.
   * Measured 2026-10-28: median ratio of rating counts for 12 global apps (Duolingo, Spotify,
   * Instagram, WhatsApp, Netflix, TikTok, YouTube, Google Maps, Uber, Shazam, Telegram, Zoom).
   */
  ratingShare: number;
};

export const COUNTRIES = [
  { code: "US", store: "us", name: "United States", flag: "🇺🇸", language: "en-US", languageName: "English (US)", ratingShare: 1 },
  { code: "UK", store: "gb", name: "United Kingdom", flag: "🇬🇧", language: "en-GB", languageName: "English (UK)", ratingShare: 0.13 },
  { code: "DE", store: "de", name: "Germany", flag: "🇩🇪", language: "de-DE", languageName: "German", ratingShare: 0.093 },
  { code: "FR", store: "fr", name: "France", flag: "🇫🇷", language: "fr-FR", languageName: "French", ratingShare: 0.11 },
  { code: "ES", store: "es", name: "Spain", flag: "🇪🇸", language: "es-ES", languageName: "Spanish (Spain)", ratingShare: 0.065 },
  { code: "IT", store: "it", name: "Italy", flag: "🇮🇹", language: "it-IT", languageName: "Italian", ratingShare: 0.07 },
  { code: "JP", store: "jp", name: "Japan", flag: "🇯🇵", language: "ja-JP", languageName: "Japanese", ratingShare: 0.14 },
  { code: "BR", store: "br", name: "Brazil", flag: "🇧🇷", language: "pt-BR", languageName: "Portuguese (Brazil)", ratingShare: 0.2 },
  { code: "IN", store: "in", name: "India", flag: "🇮🇳", language: "en-IN", languageName: "English (India)", ratingShare: 0.17 },
] as const satisfies readonly Country[];

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]];

const byCode = new Map<string, Country>(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string): Country {
  const c = byCode.get(code);
  if (!c) throw new Error(`Unsupported country: ${code}`);
  return c;
}

/** English-language storefronts: the "localized" phrase is the regional English wording. */
export const isEnglish = (code: string) => getCountry(code).language.startsWith("en");
