import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, Sparkles, Check, X, Calendar } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import connectDB from "@/lib/db"
import { ToolReview } from "@/models/ToolReview"
import { metaDescription } from "@/lib/seo"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  try {
    await connectDB()
    const review: any = await ToolReview.findOne({ toolId: id, published: true }).lean()
    if (!review) return { robots: { index: false } }
    const canonical = `/tool/${id}/review`
    return {
      title: review.title,
      description: metaDescription(review.shortDescription || review.title),
      alternates: { canonical },
      openGraph: {
        type: "article",
        url: canonical,
        title: review.title,
        description: metaDescription(review.shortDescription || review.title),
      },
    }
  } catch {
    return { robots: { index: false } }
  }
}

export default async function ToolReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  let review: any = null

  try {
    await connectDB()
    review = await ToolReview.findOne({ toolId: resolvedParams.id, published: true }).lean()
  } catch (error) {
    console.error("Failed to fetch tool review from DB:", error)
  }

  if (!review) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Article Header */}
      <div className="bg-muted/10 border-b border-border/40 pt-12 pb-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <Link href={`/tool/${resolvedParams.id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tool Overview
          </Link>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {review.title}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {review.shortDescription}
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Published on {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {review.updatedAt && review.updatedAt !== review.createdAt && (
              <div className="flex items-center gap-2">
                <span>• Updated on {new Date(review.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Article Body */}
      <div className="container max-w-4xl mx-auto px-4 mt-12">
        <article className="prose prose-lg dark:prose-invert prose-indigo max-w-none">
          
          <section className="mb-12">
            <h2 className="flex items-center gap-2 text-2xl font-bold mb-6">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Overview
            </h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {review.overview}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Key Features</h2>
            <div className="bg-muted/20 rounded-2xl p-6 md:p-8 border border-border/40">
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {review.keyFeatures}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Pros */}
            <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-none rounded-2xl">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5" /> The Good
                </h3>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {review.prosAnalysis}
                </div>
              </CardContent>
            </Card>

            {/* Cons */}
            <Card className="border-rose-500/20 bg-rose-500/5 shadow-none rounded-2xl">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2">
                  <X className="w-5 h-5" /> The Bad
                </h3>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {review.consAnalysis}
                </div>
              </CardContent>
            </Card>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Pricing Details</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {review.pricingDetails}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Use Cases</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {review.useCases}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Alternatives to Consider</h2>
            <div className="bg-muted/20 rounded-2xl p-6 border border-border/40">
              <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {review.alternatives}
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Final Verdict</h2>
            <div className="bg-indigo-500/5 border-l-4 border-indigo-500 p-6 md:p-8 rounded-r-2xl">
              <div className="text-lg text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                {review.verdict}
              </div>
            </div>
          </section>

          {review.faq && review.faq.length > 0 && (
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="space-y-6">
                {review.faq.map((item: any, i: number) => (
                  <div key={i} className="bg-background border border-border/40 rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-lg mb-2">{item.question}</h4>
                    <p className="text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

        </article>
      </div>
    </div>
  )
}
