import type { MetadataRoute } from "next";
import { SITE } from "./seo";
import { DESTINATIONS } from "@/world/destinations";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...DESTINATIONS.map((d) => ({ url: `${SITE}/world/${d.id}/`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
