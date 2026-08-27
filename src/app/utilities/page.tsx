import type { ComponentType } from "react"
import { Metadata } from "next"
import Link from "next/link"
import { Wrench, ArrowRight, ShieldCheck, Gauge, BookOpen, MonitorPlay } from "lucide-react"

export const metadata: Metadata = {
  title: "Free AI & Productivity Utilities",
  description: "Practical utilities — a YouTube video to notes and AI prompts generator, a PDF to notes, flashcards and quiz generator, and a typing & reading speed trainer. No sign-up required.",
  alternates: { canonical: "/utilities" },
}

interface Utility {
  slug: string
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  status: "available" | "coming-soon"
}

const UTILITIES: Utility[] = [
  {
    slug: "youtube-summarizer",
    title: "YouTube Summarizer",
    description: "Summarize any YouTube video into structured notes, a study guide, or a ready-to-use ChatGPT or Claude prompt — built from what the video actually says.",
    icon: MonitorPlay,
    status: "available",
  },
  {
    slug: "pdf-to-study",
    title: "PDF to Notes, Flashcards & Questions",
    description: "Upload a PDF and turn it into structured study notes, flashcards, questions and an interactive quiz — generated strictly from your document.",
    icon: BookOpen,
    status: "available",
  },
  {
    slug: "typing-reading-speed",
    title: "Typing & Reading Speed",
    description: "Practice your typing and reading skills, track WPM, accuracy, and comprehension, and see your progress over time. Practice. Measure. Improve.",
    icon: Gauge,
    status: "available",
  },
]

export default function UtilitiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="max-w-3xl mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <Wrench className="h-3 w-3" />
            <span>FindUrAI Utilities</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            Free, Fast Utilities
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Small, focused tools that solve one problem well. No sign-up required — the tools that don&apos;t need AI run entirely in your browser.
          </p>
        </div>

        {/* Utility Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {UTILITIES.map((utility) => {
            const Icon = utility.icon
            const card = (
              <div className="group relative h-full flex flex-col rounded-3xl border border-border/50 bg-card p-6 md:p-8 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-primary/5 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    {utility.status === "coming-soon" && (
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                        Coming soon
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold tracking-tight mb-2 group-hover:text-primary transition-colors">
                    {utility.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {utility.description}
                  </p>

                  {utility.status === "available" && (
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      <span>Open tool</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </div>
              </div>
            )

            return utility.status === "available" ? (
              <Link key={utility.slug} href={`/utilities/${utility.slug}`}>
                {card}
              </Link>
            ) : (
              <div key={utility.slug} className="opacity-70 cursor-not-allowed">
                {card}
              </div>
            )
          })}
        </div>

        {/* Reassurance strip */}
        <div className="mt-12 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md px-6 py-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <span>
            Tools that don&apos;t need AI — like the typing &amp; reading trainer — run entirely in your browser, with nothing uploaded. Tools that use AI, like the PDF study generator, process your file on our server only to generate your results, and never store it.
          </span>
        </div>
      </div>
    </div>
  )
}
