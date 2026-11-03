/** The free, no-sign-up tools: linked from /tools, the footer and each other, and listed in the sitemap. */
export const TOOLS = [
  {
    slug: "keyword-field-counter",
    name: "Keyword field character counter",
    blurb: "Fit your keywords into Apple's 100 characters: no spaces, no duplicates, nothing already in your name.",
  },
  {
    slug: "rank-checker",
    name: "App Store rank checker",
    blurb: "See where your app ranks for any keyword in 9 countries, and who's in the top 5.",
  },
] as const;

export type ToolSlug = (typeof TOOLS)[number]["slug"];

export const toolPath = (slug: ToolSlug) => `/tools/${slug}`;

/** Anonymous rank checks per visitor per hour. Each costs up to two Apple requests. */
export const PUBLIC_RANK_LIMIT = { checks: 10, windowMs: 60 * 60_000 };
