// The curated company list the free ATS crawler reads from.
//
// This is the one piece of manual work the free crawler costs you: Apify sells
// aggregation, and this list is what replaces it. Each entry is the company's
// slug on its ATS, which is visible in the URL of its own careers page —
// boards.greenhouse.io/SLUG, jobs.lever.co/SLUG, jobs.ashbyhq.com/SLUG.
//
// Starting narrow is deliberate (and cheaper to keep accurate). A focused list
// of employers a candidate would actually want beats an unfiltered scrape.
//
// Slugs do change when companies migrate ATS. A board that 404s is skipped
// silently rather than failing the crawl, so a stale entry degrades coverage
// instead of breaking search.

export type AtsProvider = "greenhouse" | "lever" | "ashby";

export interface CompanyBoard {
  /** Display name — used when the ATS payload doesn't carry one. */
  name: string;
  ats: AtsProvider;
  slug: string;
  /** Coarse tags so the list can later be filtered by sector or region. */
  tags?: string[];
}

/**
 * Seed list. Verified shapes at time of writing; treat coverage as a starting
 * point to grow rather than a finished dataset.
 */
export const COMPANY_BOARDS: CompanyBoard[] = [
  // --- Greenhouse ---------------------------------------------------------
  { name: "Stripe", ats: "greenhouse", slug: "stripe", tags: ["fintech", "remote-friendly"] },
  { name: "Databricks", ats: "greenhouse", slug: "databricks", tags: ["data", "ai"] },
  { name: "Reddit", ats: "greenhouse", slug: "reddit", tags: ["consumer"] },
  { name: "Airtable", ats: "greenhouse", slug: "airtable", tags: ["saas"] },
  { name: "Figma", ats: "greenhouse", slug: "figma", tags: ["design", "saas"] },
  { name: "Asana", ats: "greenhouse", slug: "asana", tags: ["saas"] },
  { name: "Cloudflare", ats: "greenhouse", slug: "cloudflare", tags: ["infra"] },
  { name: "DoorDash", ats: "greenhouse", slug: "doordash", tags: ["consumer"] },
  { name: "Instacart", ats: "greenhouse", slug: "instacart", tags: ["consumer"] },
  { name: "Robinhood", ats: "greenhouse", slug: "robinhood", tags: ["fintech"] },
  { name: "Coinbase", ats: "greenhouse", slug: "coinbase", tags: ["fintech", "crypto"] },
  { name: "Grammarly", ats: "greenhouse", slug: "grammarly", tags: ["ai", "saas"] },
  { name: "Discord", ats: "greenhouse", slug: "discord", tags: ["consumer"] },
  { name: "Twilio", ats: "greenhouse", slug: "twilio", tags: ["infra", "saas"] },
  { name: "Gitlab", ats: "greenhouse", slug: "gitlab", tags: ["devtools", "remote"] },
  { name: "Samsara", ats: "greenhouse", slug: "samsara", tags: ["iot"] },
  { name: "Affirm", ats: "greenhouse", slug: "affirm", tags: ["fintech"] },
  { name: "Sentry", ats: "greenhouse", slug: "sentry", tags: ["devtools"] },

  // --- Lever --------------------------------------------------------------
  { name: "Netflix", ats: "lever", slug: "netflix", tags: ["media"] },
  { name: "Plaid", ats: "lever", slug: "plaid", tags: ["fintech"] },
  { name: "Attentive", ats: "lever", slug: "attentive", tags: ["saas"] },
  { name: "Brex", ats: "lever", slug: "brex", tags: ["fintech"] },

  // --- Ashby --------------------------------------------------------------
  { name: "Ramp", ats: "ashby", slug: "ramp", tags: ["fintech"] },
  { name: "Linear", ats: "ashby", slug: "linear", tags: ["devtools", "saas"] },
  { name: "Vanta", ats: "ashby", slug: "vanta", tags: ["security", "saas"] },
  { name: "Deel", ats: "ashby", slug: "deel", tags: ["hr", "remote"] },
  { name: "Posthog", ats: "ashby", slug: "posthog", tags: ["devtools", "remote"] },
];

/** Filters the board list by tag — used to narrow a crawl by sector. */
export function boardsWithTag(tag: string): CompanyBoard[] {
  return COMPANY_BOARDS.filter((b) => b.tags?.includes(tag));
}
