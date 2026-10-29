import { FAQ, SITE } from "@/lib/site";
import { PLAN_LIMITS } from "@/lib/plans";

/**
 * Structured data for search engines: the product as a free web application, plus the FAQ.
 * Rendered by a server component, so it's in the HTML Google fetches.
 */
export function HomeJsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${SITE.name} by ${SITE.brand}`,
      url: SITE.url,
      description: SITE.description,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "App Store Optimization",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: `Free plan: ${PLAN_LIMITS.free.projects} projects`,
      },
      publisher: { "@type": "Organization", name: SITE.brand, url: SITE.url },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
  // "<" escaped so text can never close the script tag
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
