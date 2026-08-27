"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { RESUME_TEMPLATES } from "@/lib/resume/templates"
import { Sparkles, ArrowRight, LayoutTemplate, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 relative overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-purple-500/5 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,black,transparent)] dark:bg-black dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_15%,rgba(147,51,234,0.12),transparent_70%)]" />

      <div className="container max-w-7xl mx-auto z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            <LayoutTemplate className="w-3.5 h-3.5" />
            ATS Resume Templates
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Choose Your Resume Template
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Switch templates seamlessly at any time without losing your content. Every template is engineered for optimal ATS parsing and modern design.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {RESUME_TEMPLATES.map((tmpl, idx) => (
            <motion.div
              key={tmpl.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="rounded-2xl border border-border/80 bg-card/60 p-6 flex flex-col justify-between backdrop-blur-xl shadow-lg hover:border-primary/50 transition-all hover:-translate-y-1"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    {tmpl.badge}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{tmpl.category}</span>
                </div>

                <h3 className="text-xl font-bold text-foreground">{tmpl.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{tmpl.description}</p>
              </div>

              <div className="pt-6 mt-6 border-t border-border/60">
                <Link href="/resume/create">
                  <Button className="w-full text-xs font-semibold gap-2 rounded-xl cursor-pointer">
                    Use {tmpl.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
