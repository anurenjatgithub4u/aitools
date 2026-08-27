import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getBlogPostBySlug, getBlogPosts } from "@/lib/blog"
import { getArticleTopicContext } from "@/lib/topics"
import { Calendar, Clock, ArrowLeft, ArrowRight, User, BookOpen } from "lucide-react"
import { Metadata } from "next"
import { SITE_URL, SITE_NAME, absoluteUrl, metaDescription, breadcrumbLd, jsonLdScript } from "@/lib/seo"
import { TopicPill, ArticlePathNav } from "@/components/learn/article-path-nav"

interface Props {
  params: Promise<{ slug: string }>
}

// Generate dynamic page metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    }
  }

  const canonical = `/blog/${post.slug}`
  return {
    title: post.title,
    description: metaDescription(post.description),
    keywords: post.keywords,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: metaDescription(post.description),
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      url: canonical,
      tags: post.tags,
      images: post.featuredImage ? [{ url: post.featuredImage, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: metaDescription(post.description),
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Topic-hub context: is this article part of a learning path?
  const topicCtx = await getArticleTopicContext(slug)

  // Fetch all posts to determine related articles
  const allPosts = await getBlogPosts()
  const relatedPosts = allPosts
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3) // Get up to 3 other articles

  // JSON-LD: Article + Breadcrumbs
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`
    },
    "headline": post.title,
    "description": post.description,
    "image": post.featuredImage ? absoluteUrl(post.featuredImage) : undefined,
    "datePublished": post.date,
    "dateModified": post.date,
    "author": {
      "@type": "Organization",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": absoluteUrl("/fmafavicon.png")
      }
    }
  }
  const breadcrumb = breadcrumbLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ])

  return (
    <>
      {/* Inject JSON-LD Schema */}
      <script {...jsonLdScript([articleLd, breadcrumb])} />

      {/* Scoped typography CSS styles for blog content rendering */}
      <style>{`
        .blog-content h2 {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          color: var(--foreground);
        }
        .blog-content h3 {
          font-size: 1.35rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: var(--foreground);
        }
        .blog-content p {
          font-size: 1.05rem;
          line-height: 1.85;
          margin-bottom: 1.5rem;
          color: var(--muted-foreground);
        }
        .dark .blog-content p {
          color: oklch(0.85 0 0);
        }
        .blog-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
          color: var(--muted-foreground);
        }
        .dark .blog-content ul {
          color: oklch(0.85 0 0);
        }
        .blog-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
          color: var(--muted-foreground);
        }
        .dark .blog-content ol {
          color: oklch(0.85 0 0);
        }
        .blog-content li {
          margin-bottom: 0.5rem;
          line-height: 1.7;
        }
        .blog-content hr {
          border: 0;
          border-top: 1px solid var(--border);
          margin: 3rem 0;
        }
        .blog-content blockquote {
          border-left: 4px solid var(--primary);
          padding-left: 1.25rem;
          font-style: italic;
          margin: 1.5rem 0;
          color: var(--foreground);
        }
        .blog-content a {
          color: var(--primary);
          font-weight: 500;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: opacity 0.2s;
        }
        .blog-content a:hover {
          opacity: 0.8;
        }
        .blog-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
          font-size: 0.95rem;
        }
        .blog-content th {
          background-color: var(--secondary);
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
          font-weight: 600;
          text-align: left;
        }
        .blog-content td {
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
        }
        .blog-content pre {
          background-color: var(--secondary);
          padding: 1.25rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin-bottom: 1.5rem;
          border: 1px solid var(--border);
        }
        .blog-content code {
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.9em;
          background-color: var(--secondary);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
        }
        .blog-content pre code {
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          font-size: 0.875rem;
        }
      `}</style>

      <div className="min-h-screen py-12 md:py-16">
        <div className="container max-w-7xl mx-auto px-4">
          {/* Back button */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Articles
          </Link>

          {/* Article Header */}
          <div className="max-w-4xl mb-12">
            <div className="flex items-center gap-3 text-sm text-primary font-semibold mb-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                {post.category}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Author / Date Metadata */}
            <div className="flex flex-wrap items-center gap-y-4 gap-x-6 pb-8 border-b border-border/60 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-border">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-semibold text-foreground">{post.author}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{post.readingTime}</span>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="relative aspect-[3/2] md:aspect-[16/9] max-h-[500px] w-full rounded-3xl overflow-hidden mb-12 border border-border/50 shadow-lg bg-background">
            {post.featuredImage ? (
              <>
                {/* Blurred Background to fill empty spaces beautifully */}
                <div 
                  className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-50 select-none pointer-events-none"
                  style={{ backgroundImage: `url(${post.featuredImage})` }}
                />
                {/* Main Image */}
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  fill
                  priority
                  className="object-contain relative z-10"
                />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/15" />
                <BookOpen className="h-10 w-10 text-primary/60 relative z-10" />
                <span className="text-xs text-muted-foreground/60 uppercase tracking-widest font-mono relative z-10">Featured Article Image</span>
              </div>
            )}
          </div>

          {/* Two-Column Layout: Article Body + Table of Contents */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Table of Contents - Mobile (collapsible, renders at top of content area on small screens) */}
            {post.toc.length > 0 && (
              <details className="lg:hidden bg-card/40 border border-border/50 rounded-2xl p-6 mb-4">
                <summary className="text-lg font-bold flex items-center gap-2 cursor-pointer list-none">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Table of Contents
                </summary>
                <nav className="flex flex-col gap-2.5 mt-4">
                  {post.toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors leading-relaxed"
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </details>
            )}

            {/* Main Article Body */}
            <main className="lg:col-span-8 max-w-none">
              {topicCtx && (
                <div className="mb-6">
                  <TopicPill ctx={topicCtx} />
                </div>
              )}
              <article
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: post.htmlContent }}
              />
              {topicCtx && <ArticlePathNav ctx={topicCtx} articleSlug={slug} />}
            </main>

            {/* Table of Contents - Desktop (Sticky Sidebar) */}
            {post.toc.length > 0 && (
              <aside className="hidden lg:block lg:col-span-4">
                <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto bg-card/30 border border-border/40 rounded-2xl p-6 backdrop-blur-sm">
                  <h2 className="text-md font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Table of Contents
                  </h2>
                  <nav className="flex flex-col gap-3">
                    {post.toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors leading-relaxed"
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}
          </div>

          {/* Related Articles Section */}
          {relatedPosts.length > 0 && (
            <div className="mt-20 pt-12 border-t border-border">
              <h3 className="text-2xl font-bold mb-8">Related Articles</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {relatedPosts.map((rPost) => (
                  <article
                    key={rPost.slug}
                    className="group flex flex-col rounded-2xl border border-border/50 bg-card/30 overflow-hidden hover:border-primary/20 hover:bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border-b border-border/40">
                      {rPost.featuredImage ? (
                        <Image
                          src={rPost.featuredImage}
                          alt={rPost.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 opacity-70 group-hover:opacity-100 transition-opacity" />
                          <span className="text-xs text-muted-foreground/40 uppercase tracking-widest font-mono">Article Image</span>
                        </>
                      )}
                    </div>

                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-semibold">
                          {rPost.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rPost.readingTime}
                        </span>
                      </div>

                      <Link href={`/blog/${rPost.slug}`} className="block mb-2">
                        <h4 className="text-md font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {rPost.title}
                        </h4>
                      </Link>

                      <p className="text-xs text-muted-foreground line-clamp-3 mb-6 leading-relaxed">
                        {rPost.description}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40 text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{rPost.author}</span>
                          <span className="text-muted-foreground mt-0.5">
                            {new Date(rPost.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </div>

                        <Link
                          href={`/blog/${rPost.slug}`}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          <span>Read</span>
                          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
