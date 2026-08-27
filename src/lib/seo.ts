// Single source of truth for site-wide SEO values and structured-data builders.
// Centralised so the canonical host, brand name and JSON-LD stay consistent
// across every page (fixes www/non-www duplication and duplicate metadata).

// Must match the primary domain Google serves (www) — a non-www value here
// makes every canonical/sitemap URL disagree with the indexed host.
export const SITE_URL = "https://www.findurai.com";
export const SITE_NAME = "FindurAI";
export const SITE_DESCRIPTION =
  "Discover, compare and choose the best AI tools. Describe your task and find the right AI tool with reviews, pricing, features and alternatives.";
// TODO (manual): replace with a dedicated 1200x630 social image for richer cards.
export const DEFAULT_OG_IMAGE = "/fmafavicon.png";
export const TWITTER_HANDLE = "@findurai";

export function absoluteUrl(path = ""): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Trim a description to a clean ~155 char snippet on a word boundary.
export function metaDescription(text: string, max = 158): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "").trim() + "…";
}

export function slugify(text: string): string {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "AI Writing" -> "Best AI Writing Tools" ; "Developer Tools" -> "Best Developer Tools"
export function categoryTitle(category: string): string {
  const c = (category || "").trim();
  return /tools?$/i.test(c) ? `Best ${c}` : `Best ${c} Tools`;
}

type LdObject = Record<string, unknown>;

export function organizationLd(): LdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/fmafavicon.png"),
  };
}

export function websiteLd(): LdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): LdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

interface ToolLike {
  id: string;
  name: string;
  description?: string;
  category?: string;
  rating?: number;
  pricing?: string;
  website?: string;
  best_for?: string;
}

export function softwareApplicationLd(tool: ToolLike): LdObject {
  // NOTE: aggregateRating is intentionally omitted. Google's review-snippet
  // policy requires ratings to reflect genuine user reviews; a single editorial
  // score would risk a manual action. Add it from real ToolReview data later.
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    applicationCategory: tool.category || "AI Tool",
    operatingSystem: "Web",
    url: absoluteUrl(`/tool/${tool.id}`),
    offers: {
      "@type": "Offer",
      price: tool.pricing === "Free" ? "0" : undefined,
      priceCurrency: "USD",
      category: tool.pricing,
    },
  };
}

export function faqLd(faq: { question: string; answer: string }[]): LdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

// Render-ready <script> props for inlining JSON-LD.
export function jsonLdScript(data: LdObject | LdObject[]) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  };
}
