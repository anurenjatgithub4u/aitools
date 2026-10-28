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
};

export const COUNTRIES = [
  { code: "US", store: "us", name: "United States", flag: "🇺🇸", language: "en-US", languageName: "English (US)" },
  { code: "UK", store: "gb", name: "United Kingdom", flag: "🇬🇧", language: "en-GB", languageName: "English (UK)" },
  { code: "DE", store: "de", name: "Germany", flag: "🇩🇪", language: "de-DE", languageName: "German" },
  { code: "FR", store: "fr", name: "France", flag: "🇫🇷", language: "fr-FR", languageName: "French" },
  { code: "ES", store: "es", name: "Spain", flag: "🇪🇸", language: "es-ES", languageName: "Spanish (Spain)" },
  { code: "IT", store: "it", name: "Italy", flag: "🇮🇹", language: "it-IT", languageName: "Italian" },
  { code: "JP", store: "jp", name: "Japan", flag: "🇯🇵", language: "ja-JP", languageName: "Japanese" },
  { code: "BR", store: "br", name: "Brazil", flag: "🇧🇷", language: "pt-BR", languageName: "Portuguese (Brazil)" },
  { code: "IN", store: "in", name: "India", flag: "🇮🇳", language: "en-IN", languageName: "English (India)" },
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
