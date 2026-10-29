import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Public pages only. Project boards are private and not listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
