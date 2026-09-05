// Community product leaderboard: makers submit a product for free, signed-in
// users upvote, ranking is by upvote count.
//
// Deliberately not the old AI tool directory. Those pages were admin/AI-seeded,
// templated, and Google declined to index 42% of them — they stay archived
// behind TOOL_DIRECTORY_ENABLED. This feature only ever shows products a real
// person submitted.

/**
 * Master switch for the leaderboard: the homepage listing, /submit,
 * /product/[slug] and every /api/products endpoint.
 *
 * Defaults ON — unlike the archived features, this is the product. The flag
 * exists so it can be pulled quickly if submissions get abused, following the
 * same convention as JOBS_FEATURE_ENABLED and TOOL_DIRECTORY_ENABLED.
 *
 * Set NEXT_PUBLIC_PRODUCTS_ENABLED=false to switch it off.
 */
export const PRODUCTS_ENABLED = process.env.NEXT_PUBLIC_PRODUCTS_ENABLED !== "false";

/**
 * Categories. One source of truth: the submit form's dropdown and the
 * leaderboard's filter chips both read this, so a product can never land in a
 * category the filters don't offer.
 */
export const PRODUCT_CATEGORIES = [
  "AI",
  "Developer Tools",
  "Productivity",
  "Marketing",
  "Design",
  "Education",
  "Finance",
  "Social",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export function isValidCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Field limits — enforced on the server, mirrored as maxLength in the form.
// ---------------------------------------------------------------------------

export const MAX_NAME_CHARS = 60;
export const MAX_TAGLINE_CHARS = 120;
export const MIN_DESCRIPTION_CHARS = 20;
export const MAX_DESCRIPTION_CHARS = 2000;

// ---------------------------------------------------------------------------
// Daily caps (per account)
// ---------------------------------------------------------------------------

/** Submitting is auto-publish, so this is the main brake on a spam flood. */
export const MAX_SUBMISSIONS_PER_DAY = 5;

/** Generous — a real browsing session upvotes freely; this only stops scripts. */
export const MAX_VOTES_PER_DAY = 100;
