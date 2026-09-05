import { MetadataRoute } from 'next'
import connectDB from "@/lib/db"
import { Tool } from "@/models/Tool"
import { getBlogPosts } from "@/lib/blog"
import { getAllPacks } from "@/lib/packs"
import { SITE_URL, slugify } from "@/lib/seo"
import { TOOL_DIRECTORY_ENABLED } from "@/lib/tools/config"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL
  const now = new Date().toISOString()

  // Core static pages
  const staticRoutes = [
    // '/jobs', the tool directory's '/search', '/compare' and '/submit-tool',
    // and the resume builder are omitted while paused/disabled — an indexed
    // URL for a disabled page is worse than no URL at all.
    '',
    ...(TOOL_DIRECTORY_ENABLED ? ['/search', '/compare', '/submit-tool'] : []),
    '/blog',
    '/packs',
    '/utilities',
    '/utilities/youtube-summarizer',
    '/utilities/pdf-to-study',
    '/utilities/resume-interview',
    '/utilities/typing-reading-speed',
    '/pdf',
    '/pdf/compressor',
    '/pdf/splitter',
    '/pdf/merger',
    '/pdf/to-jpg',
    '/pdf/to-png',
    '/pdf/to-webp',
    '/pdf/jpg-to-pdf',
    '/pdf/png-to-pdf',
    '/pdf/webp-to-pdf',
    '/pdf/html-to-pdf',
    '/pdf/word-to-pdf',
    '/pdf/page-numbers',
    '/pdf/rotate',
    '/pdf/protect',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))

  // Blog posts
  let blogRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = await getBlogPosts()
    blogRoutes = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date).toISOString() : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    console.error("Failed to generate blog sitemap:", error)
  }

  // Tool pages + category pages from MongoDB — only while the directory is enabled.
  let toolRoutes: MetadataRoute.Sitemap = []
  let categoryRoutes: MetadataRoute.Sitemap = []
  if (TOOL_DIRECTORY_ENABLED) {
    try {
      await connectDB()
      const tools = await Tool.find({}, { id: 1, category: 1, primaryCategory: 1 }).lean()
      toolRoutes = tools.map((tool: any) => ({
        url: `${baseUrl}/tool/${tool.id}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))

      const slugs = new Set<string>()
      for (const t of tools as any[]) {
        if (t.primaryCategory) slugs.add(slugify(t.primaryCategory))
        if (t.category) slugs.add(slugify(t.category))
      }
      categoryRoutes = [...slugs].filter(Boolean).map((slug) => ({
        url: `${baseUrl}/category/${slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    } catch (error) {
      console.error("Failed to generate tool sitemap:", error)
    }
  }

  // Prompt Pack landing pages — the SEO/AEO wedge
  let packRoutes: MetadataRoute.Sitemap = []
  try {
    packRoutes = getAllPacks().map((pack) => ({
      url: `${baseUrl}/packs/${pack.slug}`,
      lastModified: new Date(pack.lastVerifiedDate).toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (error) {
    console.error("Failed to generate pack sitemap:", error)
  }

  return [...staticRoutes, ...packRoutes, ...categoryRoutes, ...blogRoutes, ...toolRoutes]
}
