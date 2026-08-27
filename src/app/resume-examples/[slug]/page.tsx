"use client"

import { use } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { REFERENCE_RESUMES } from "@/lib/resume/reference-resumes"
import { RESUME_TEMPLATES } from "@/lib/resume/templates"
import { ArrowLeft, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TemplateRenderer } from "@/components/resume/TemplateRenderer"
import { ResumeData } from "@/types/resume"

export default function ReferenceResumeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug

  const refProfile = REFERENCE_RESUMES.find((r) => r.slug === slug)
  if (!refProfile) {
    notFound()
  }

  const template = RESUME_TEMPLATES.find((t) => t.id === refProfile.templateId) || RESUME_TEMPLATES[0]

  const mockResumeData: ResumeData = {
    id: `ref_${refProfile.slug}`,
    title: refProfile.title,
    targetRole: refProfile.sampleData.targetRole || refProfile.title,
    experienceLevel: refProfile.experienceLevel,
    basics: {
      name: refProfile.sampleData.basics?.name || "Sample Candidate",
      title: refProfile.sampleData.basics?.title || refProfile.title,
      email: refProfile.sampleData.basics?.email || "candidate@example.com",
      phone: refProfile.sampleData.basics?.phone || "+1 (555) 019-2834",
      location: refProfile.sampleData.basics?.location || "San Francisco, CA",
      linkedin: refProfile.sampleData.basics?.linkedin || "linkedin.com/in/sample",
      portfolio: refProfile.sampleData.basics?.portfolio || "sample.dev",
      github: refProfile.sampleData.basics?.github || "github.com/sample",
    },
    summary: refProfile.sampleData.summary || "",
    experience: refProfile.sampleData.experience || [],
    education: refProfile.sampleData.education || [],
    skills: refProfile.sampleData.skills || [],
    projects: refProfile.sampleData.projects || [],
    certifications: refProfile.sampleData.certifications || [],
    achievements: refProfile.sampleData.achievements || [],
    languages: refProfile.sampleData.languages || ["English"],
    settings: {
      templateId: refProfile.templateId,
      fontFamily: template.fontFamily,
      fontSize: "md",
      spacing: "normal",
      accentColor: template.accentColor,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="container max-w-6xl mx-auto space-y-8">
        <Link href="/resume-examples" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Reference Library
        </Link>

        {/* Hero Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-xl">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% ATS Parsable Template
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {refProfile.title} Resume Example
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              {refProfile.description}
            </p>
          </div>

          <Link href={`/resume/create?ref=${refProfile.slug}`}>
            <Button size="lg" className="h-12 rounded-xl px-7 text-sm font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-95 shadow-lg shadow-purple-500/20 cursor-pointer">
              <Sparkles className="w-4 h-4 mr-2" />
              Create Resume Like This
            </Button>
          </Link>
        </div>

        {/* 2-Column Details & Live Canvas Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Guide / SEO Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl border border-border/80 bg-card/40 space-y-4">
              <h2 className="text-lg font-bold text-foreground">Role Requirements & ATS Tips</h2>
              <ul className="space-y-3 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Highlight role-specific keywords in your summary and core technical skills section.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Use concise bullet points starting with strong action verbs (e.g. Developed, Architected, Reduced).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Avoid tables inside the content area and excessive graphics that obstruct ATS parser bots.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Live Sample Resume Preview */}
          <div className="lg:col-span-7 shadow-2xl rounded-xl overflow-hidden border border-border/60 bg-white">
            <TemplateRenderer data={mockResumeData} templateId={refProfile.templateId} isEditable={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
