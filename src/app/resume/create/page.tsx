"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams, notFound } from "next/navigation"
import { motion } from "framer-motion"
import { Sparkles, ArrowRight, CheckCircle, FileText, ChevronDown, Briefcase, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveResume } from "@/lib/resume/storage"
import { REFERENCE_RESUMES } from "@/lib/resume/reference-resumes"
import { RESUME_BUILDER_ENABLED } from "@/lib/resume/config"

const EXAMPLE_PROMPTS = [
  "Create a resume for a frontend developer with 2 years of experience in React and TypeScript.",
  "I'm a fresh computer science graduate looking for software engineering entry-level jobs.",
  "I'm an Android developer with 3 years experience building Kotlin apps with Jetpack Compose.",
  "I'm a product manager with 4 years of experience leading cross-functional SaaS product teams.",
]

function ResumeCreateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refParam = searchParams.get("ref")

  const [prompt, setPrompt] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [experienceLevel, setExperienceLevel] = useState("1–3 years")
  const [resumeType, setResumeType] = useState("General Resume")
  const [jobDescription, setJobDescription] = useState("")
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Pre-fill if coming from reference resume
  useEffect(() => {
    if (refParam) {
      const refObj = REFERENCE_RESUMES.find((r) => r.slug === refParam)
      if (refObj) {
        setTargetRole(refObj.sampleData.targetRole || refObj.title)
        setPrompt(`Create a ${refObj.title} resume highlighting key skills in ${refObj.highlights.join(", ")}.`)
      }
    }
  }, [refParam])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      setError("Please describe the resume you want to create.")
      return
    }

    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          targetRole,
          experienceLevel,
          resumeType,
          jobDescription,
          referenceContext: refParam ? `Based on reference template for ${refParam}` : "",
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.resume) {
        throw new Error(data.error || "Failed to generate resume.")
      }

      // Save to localStorage
      saveResume(data.resume)

      // Navigate directly to Canva-like visual editor
      router.push(`/resume/editor/${data.resume.id}`)
    } catch (err: any) {
      console.error("Resume generation error:", err)
      setError(err.message || "An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative overflow-hidden">
      {/* Dark theme soft ambient background light */}
      <div className="fixed inset-0 -z-10 bg-purple-500/5 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,black,transparent)] dark:bg-black dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_15%,rgba(147,51,234,0.12),transparent_70%)]" />

      <div className="container max-w-3xl mx-auto z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI Resume Builder MVP
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            Create Your Resume
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Tell us about your experience in natural language. AI will create your initial professional resume draft.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-border/80 bg-card/70 p-6 md:p-8 backdrop-blur-xl shadow-2xl"
        >
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label htmlFor="resume-prompt" className="block text-sm font-semibold text-foreground mb-2">
                What kind of resume do you want to create? <span className="text-destructive">*</span>
              </label>
              <textarea
                id="resume-prompt"
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: I'm a software engineer with 3 years of experience in Android development. I work with Kotlin, Jetpack Compose, Firebase, and REST APIs. I'm applying for Android Developer roles."
                className="w-full rounded-xl border border-input bg-background/80 p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y"
              />
              {error && <p className="text-xs text-destructive mt-1 font-medium">{error}</p>}
            </div>

            {/* Quick Prompt Suggestions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Or choose an example prompt to start:
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="text-left text-xs bg-muted/60 hover:bg-muted hover:text-primary text-muted-foreground rounded-lg px-3 py-2 border border-border/50 transition-colors"
                  >
                    "{ex.slice(0, 60)}..."
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Structured Fields Accordion */}
            <div className="border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Optional Details (Target Role, Job Description)
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showOptionalFields ? "rotate-180" : ""}`} />
              </button>

              {showOptionalFields && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 pt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="target-role" className="block text-xs font-medium text-muted-foreground mb-1">Target Role</label>
                      <input
                        id="target-role"
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Android Developer"
                        className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="experience-level" className="block text-xs font-medium text-muted-foreground mb-1">Experience Level</label>
                      <select
                        id="experience-level"
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="Student">Student</option>
                        <option value="Fresher">Fresher</option>
                        <option value="0–1 years">0–1 years</option>
                        <option value="1–3 years">1–3 years</option>
                        <option value="3–5 years">3–5 years</option>
                        <option value="5+ years">5+ years</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="resume-type" className="block text-xs font-medium text-muted-foreground mb-1">Resume Type</label>
                      <select
                        id="resume-type"
                        value={resumeType}
                        onChange={(e) => setResumeType(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="General Resume">General Resume</option>
                        <option value="Job Application">Job Application</option>
                        <option value="Internship">Internship</option>
                        <option value="Academic">Academic</option>
                        <option value="Career Change">Career Change</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="job-description" className="block text-xs font-medium text-muted-foreground mb-1">
                      Have a specific job in mind? (Paste Job Description)
                    </label>
                    <textarea
                      id="job-description"
                      rows={3}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste target job posting description here to tailor ATS keywords..."
                      className="w-full rounded-lg border border-input bg-background/80 p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-95 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  Generating AI Resume Draft...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Generate My Resume
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default function ResumeCreatePage() {
  if (!RESUME_BUILDER_ENABLED) notFound()

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading Resume Builder...</div>}>
      <ResumeCreateContent />
    </Suspense>
  )
}
