import type { MetadataRoute } from "next";
import { SITE } from "./seo";
import { DESTINATIONS } from "@/world/destinations";
import { PLAY_PAGES } from "./play/pages";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/about/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/games/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/little-kerala/`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/how-to-play/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/map/`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...PLAY_PAGES.map((p) => ({ url: `${SITE}/play/${p.slug}/`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${SITE}/play/monopoly/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...DESTINATIONS.map((d) => ({ url: `${SITE}/world/${d.id}/`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
