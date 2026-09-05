import { Metadata } from "next"
import Link from "next/link"
import { Sparkles, Compass, ShieldCheck, Heart, Layers, Users } from "lucide-react"

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about FindurAI, our mission to index the world's best AI tools, and how we help you find the perfect AI companion for your workflow.",
  alternates: { canonical: "/about" },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-16 md:py-24">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Discover the Future</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            About FindUrAI
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Our mission is simple: to help creators, developers, students, and businesses find the perfect artificial intelligence tools to accelerate their work.
          </p>
        </div>

        {/* Mission Card */}
        <div className="relative rounded-3xl p-8 md:p-12 border border-border/50 bg-card/60 backdrop-blur-md shadow-xl hover:border-primary/20 transition-all duration-300 mb-16 overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
          
          <div className="grid md:grid-cols-12 gap-8 items-center relative z-10">
            <div className="md:col-span-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Navigating the AI Revolution</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                With hundreds of new AI tools launching every week, finding the right one can feel overwhelming. FindUrAI was built to cut through the noise. We index, categorize, and review AI applications to give you the clear insights you need.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're looking for an AI writing partner, an automated image generator, a developer copilot, or real-time web agents, we make finding and comparing tools intuitive, fast, and reliable.
              </p>
            </div>
            <div className="md:col-span-4 flex justify-center">
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-primary/20 shadow-inner">
                <Compass className="h-16 w-16 text-primary animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-border/40 bg-card/40 hover:bg-card/75 hover:border-primary/20 transition-all duration-300 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/15">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Verified Content</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We strive to maintain high-quality listings. We review tools for validity, actual performance, and reliable pricing before featuring them.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/40 bg-card/40 hover:bg-card/75 hover:border-primary/20 transition-all duration-300 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/15">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Dynamic Comparison</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We believe comparing tools should be simple. Our platform provides side-by-side spec layouts so you can make informed decisions.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/40 bg-card/40 hover:bg-card/75 hover:border-primary/20 transition-all duration-300 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 border border-purple-500/15">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Community Focused</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                User feedback drives our directory. Reviews, recommendations, and bookmarks help creators choose the best systems based on actual developer and writer experiences.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center rounded-3xl p-8 md:p-12 border border-border/40 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-primary/10 backdrop-blur-sm">
          <Users className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Start Finding Your Next AI Tool</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Ready to turn your own material into something you can actually study? Open your workspace or browse the free utilities.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/workspace"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all shadow-md shadow-primary/10 hover:shadow-primary/20"
            >
              Open Workspace
            </Link>
            <Link
              href="/utilities"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-border/80 bg-background/50 hover:bg-background/80 hover:border-border transition-all font-semibold"
            >
              Browse Utilities
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
