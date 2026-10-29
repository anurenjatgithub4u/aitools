import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** Crawl the public pages; keep private boards and the API out of search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/app/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
