import type { MetadataRoute } from "next";
import { COUNTRY_PAGES, countryPagePath } from "@/lib/seo/country-pages";
import { SITE } from "@/lib/site";

/** Public pages only. Project boards are private and not listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/aso`, changeFrequency: "monthly", priority: 0.8 },
    ...COUNTRY_PAGES.map((p) => ({ url: `${SITE.url}${countryPagePath(p)}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE.url}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
