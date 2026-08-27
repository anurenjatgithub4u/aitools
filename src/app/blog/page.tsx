import Link from "next/link"
import Image from "next/image"
import { getBlogPosts } from "@/lib/blog"
import { getAllTopics } from "@/lib/topics"
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Resources & Insights Blog",
  description: "Stay ahead with the latest AI trends, in-depth comparisons, student guides, and actionable tips for choosing and using artificial intelligence tools.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "AI Resources & Insights Blog | FindurAI",
    description: "Stay ahead with the latest AI trends, in-depth comparisons, student guides, and actionable tips for choosing and using artificial intelligence tools.",
    type: "website",
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Resources & Insights Blog | FindurAI",
    description: "Stay ahead with the latest AI trends, in-depth comparisons, student guides, and actionable tips for choosing and using artificial intelligence tools.",
  }
}

export default async function BlogPage() {
  const posts = await getBlogPosts()
  
  if (posts.length === 0) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Our Blog is Coming Soon!</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          We are busy crafting insightful, human-written articles on the best AI tools, workflows, and comparisons. Check back shortly!
        </p>
      </div>
    )
  }

  // Topic hubs absorb their cluster articles: any article that belongs to a
  // topic's learning path is pulled out of the flat card grid and represented
  // once by its Topic Hub card instead (see DESIGN_KNOWLEDGE_HUB.md).
  const topics = await getAllTopics()
  const clusteredSlugs = new Set(
    topics.flatMap((t) => [
      ...t.learningPath.flatMap((s) => s.items.map((i) => i.slug)),
      ...t.reference.map((i) => i.slug),
    ])
  )

  const generalPosts = posts.filter(
    (p) => p.category !== "AI Engineering" && !clusteredSlugs.has(p.slug)
  )

  const featuredPost = generalPosts[0] ?? posts[0]
  const remainingPosts = generalPosts.slice(1)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="max-w-3xl mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <BookOpen className="h-3 w-3" />
            <span>FindUrAI Insights</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            AI Guides, Comparisons & Tutorials
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Helping you master artificial intelligence tools for study, work, and creative expression. Genuinely helpful, human-written guides.
          </p>
        </div>

        {/* Featured Post Card */}
        {featuredPost && (
          <div className="mb-16">
            <div className="group relative rounded-3xl overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-primary/5">
              <div className="grid md:grid-cols-12 gap-6 md:gap-0">
                <div className="md:col-span-7 relative min-h-[300px] md:min-h-[480px] overflow-hidden">
                  {featuredPost.featuredImage ? (
                    <Image
                      src={featuredPost.featuredImage}
                      alt={featuredPost.title}
                      fill
                      priority
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-xs text-muted-foreground/60 uppercase tracking-widest font-mono">Featured Image</span>
                      </div>
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-background/95 z-10" />
                </div>
                
                <div className="md:col-span-5 p-6 md:p-12 flex flex-col justify-center relative z-20">
                  <div className="flex items-center gap-4 mb-4 text-xs font-medium text-muted-foreground">
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
                      {featuredPost.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {featuredPost.readingTime}
                    </span>
                  </div>
                  
                  <Link href={`/blog/${featuredPost.slug}`}>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 group-hover:text-primary transition-colors leading-tight">
                      {featuredPost.title}
                    </h2>
                  </Link>
                  
                  <p className="text-muted-foreground mb-6 line-clamp-3 text-sm md:text-base leading-relaxed">
                    {featuredPost.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/40">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{featuredPost.author}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(featuredPost.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                    
                    <Link 
                      href={`/blog/${featuredPost.slug}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full h-10 px-4 bg-foreground text-background font-medium hover:bg-primary hover:text-primary-foreground transition-all group/btn"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remaining Posts Grid */}
        {remainingPosts.length > 0 && (
          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-8 border-b border-border pb-3">Productivity & More</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {remainingPosts.map((post) => (
                <article
                  key={post.slug}
                  className="group flex flex-col rounded-2xl border border-border/50 bg-card/50 overflow-hidden hover:border-primary/20 hover:bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border-b border-border/40">
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
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
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readingTime}
                      </span>
                    </div>
                    
                    <Link href={`/blog/${post.slug}`} className="block mb-2">
                      <h4 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h4>
                    </Link>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-6 leading-relaxed">
                      {post.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{post.author}</p>
                        <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                      
                      <Link 
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        <span>Read More</span>
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
  )
}
