// Site identity for SEO and sharing. Change the name here when the product gets its final name.

export const SITE = {
  name: "Keyword Planner",
  brand: "FindUrAI",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.findurai.com").replace(/\/$/, ""),
  title: "App Store Keyword Research & ASO by Country",
  description:
    "Find the App Store keywords people really search in every country. AI keyword ideas, local-language phrases, live iOS rank checks, search volume and difficulty estimates. 2 projects free.",
  /** Meta keywords and topical tags. Search engines mostly ignore the meta tag, but social sites and some directories still read it. */
  keywords: [
    "ASO",
    "ASO tool",
    "app store optimization",
    "App Store keyword research",
    "app keyword planner",
    "iOS keyword ranking",
    "app store rank checker",
    "app keyword tracker",
    "keyword difficulty",
    "app search volume",
    "ASO localization",
    "app store keywords by country",
    "AI keyword generator",
    "competitor keyword ranks",
    "localize app store keywords",
    "app store keywords in German",
    "ASO for Japan",
    "app store keyword field character limit",
    "free iOS keyword rank checker",
    "app store keyword difficulty checker",
    "ASO for indie developers",
    "FindUrAI",
  ],
} as const;

export const FAQ = [
  {
    q: "What is App Store keyword research?",
    a: "It is finding the words people type into App Store search when they look for an app like yours, then checking how hard each one is and where your app ranks, so you can pick keywords for your title, subtitle and keyword field.",
  },
  {
    q: "Is the search volume real Apple data?",
    a: "No. Apple doesn't publish search volume. The volume score is an estimate from how many ratings the top apps for that search have, adjusted for the size of each country's App Store.",
  },
  {
    q: "Which countries are supported?",
    a: "United States, United Kingdom, Germany, France, Spain, Italy, Japan, Brazil and India. Each keyword is rewritten the way locals actually search, not translated word for word.",
  },
  {
    q: "Do I need to translate my App Store keywords for each country?",
    a: "Not translate, localize. A word-for-word translation is often not what people type: Spaniards search \"el tiempo\" for weather, not \"clima\", and Japanese users search 家計簿 for a budget app. Each storefront has its own title, subtitle and keyword field, so fill them with the phrases locals use.",
  },
  {
    q: "How many characters is the App Store keyword field?",
    a: "100 characters per localization, plus 30 for the app name and 30 for the subtitle. Separate keywords with commas and no spaces, don't repeat words already in your name or subtitle, and skip your own app name, which is already indexed.",
  },
  {
    q: "Is it free?",
    a: "Yes, every account gets 2 projects free with AI brainstorming, localization and live rank checks. Premium for unlimited projects is coming soon.",
  },
] as const;
