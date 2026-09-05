"use client"

import { useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { motion } from "framer-motion"
import { REFERENCE_RESUMES } from "@/lib/resume/reference-resumes"
import { RESUME_TEMPLATES } from "@/lib/resume/templates"
import { Sparkles, ArrowRight, Eye, CheckCircle2, LayoutTemplate } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RESUME_BUILDER_ENABLED } from "@/lib/resume/config"

export default function ResumeExamplesPage() {
  if (!RESUME_BUILDER_ENABLED) notFound()

  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  const categories = ["All", "Technology", "Business", "Students"]

  const filteredResumes =
    selectedCategory === "All"
      ? REFERENCE_RESUMES
      : REFERENCE_RESUMES.filter((r) => r.category === selectedCategory)

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="fixed inset-0 -z-10 bg-purple-500/5 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,black,transparent)] dark:bg-black dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_15%,rgba(147,51,234,0.12),transparent_70%)]" />

      <div className="container max-w-7xl mx-auto z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            FindUrAI Reference Library
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Resume Examples & Templates
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Browse ATS-optimized sample resumes curated for specific roles and industries. Use any structure as guidance for AI generation.
          </p>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Resumes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResumes.map((resume, idx) => {
            const template = RESUME_TEMPLATES.find((t) => t.id === resume.templateId) || RESUME_TEMPLATES[0]

            return (
              <motion.div
                key={resume.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group rounded-2xl border border-border/80 bg-card/60 p-6 flex flex-col justify-between backdrop-blur-xl shadow-lg hover:border-primary/50 transition-all hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      {resume.experienceLevel}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <LayoutTemplate className="w-3 h-3" />
                      {template.name}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {resume.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {resume.description}
                  </p>

                  <div className="space-y-1.5 mb-6">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Key Highlights</span>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.highlights.map((h, hIdx) => (
                        <span
                          key={hIdx}
                          className="text-[10px] bg-muted/80 text-foreground px-2 py-0.5 rounded-md border border-border/50"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                  <Link href={`/resume-examples/${resume.slug}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 rounded-xl cursor-pointer">
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </Button>
                  </Link>

                  <Link href={`/resume/create?ref=${resume.slug}`} className="flex-1">
                    <Button size="sm" className="w-full text-xs gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                      Use Structure
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
