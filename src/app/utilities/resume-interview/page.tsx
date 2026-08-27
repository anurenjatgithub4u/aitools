import { Metadata } from "next"
import { Briefcase } from "lucide-react"
import { ResumeInterviewTool } from "./resume-interview-tool"
import { breadcrumbLd, jsonLdScript, absoluteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  title: "AI Resume Analyzer & Mock Interview",
  description: "Upload your resume for an AI-scored analysis, then practice a mock interview built from what's actually on it — 70% your resume, 30% your target role.",
  alternates: { canonical: "/utilities/resume-interview" },
  openGraph: {
    title: "AI Resume Analyzer & Mock Interview | FindurAI",
    description: "Upload your resume for an AI-scored analysis, then practice a mock interview built from what's actually on it.",
    type: "website",
    url: "/utilities/resume-interview",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Resume Analyzer & Mock Interview | FindurAI",
    description: "Upload your resume for an AI-scored analysis, then practice a mock interview built from what's actually on it.",
  },
}

export default function ResumeInterviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <script {...jsonLdScript(breadcrumbLd([
        { name: "Utilities", path: "/utilities" },
        { name: "AI Resume Analyzer & Mock Interview", path: "/utilities/resume-interview" },
      ]))} />
      <script
        {...jsonLdScript({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "AI Resume Analyzer & Mock Interview",
          description: "Upload a resume for an AI-scored analysis and a personalized mock interview built from your actual experience and target role.",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: absoluteUrl("/utilities/resume-interview"),
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        })}
      />

      <div className="container max-w-5xl mx-auto px-4">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <Briefcase className="h-3 w-3" />
            <span>Career Prep</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            AI Resume Analyzer & Mock Interview
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Upload your resume. We&apos;ll score it, tell you what to fix, and interview you like someone who actually read it — questions drawn from your real experience, plus role-specific knowledge checks.
          </p>
        </div>

        <ResumeInterviewTool />

        <div className="mt-20 max-w-3xl space-y-10">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">How this is different from a generic AI interview generator</h2>
            <p className="text-muted-foreground leading-relaxed">
              Most practice-interview tools ask generic questions for a job title, regardless of who you actually are. This one reads your resume first — your projects, your listed technologies, the numbers and claims you wrote down — and builds most of the interview directly from that. About 70% of the questions reference something specific from your resume, including the claims most candidates struggle to defend under a follow-up. The rest test general knowledge for your target role, so you&apos;re not only ever talking about what you already wrote down.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">What you get</h2>
            <ul className="text-muted-foreground leading-relaxed list-disc list-outside pl-5 space-y-2">
              <li>A resume score with a breakdown across ATS readiness, clarity, technical skills, achievements, and relevance to your target role</li>
              <li>Concrete strengths and weaknesses, each backed by something specific in your resume</li>
              <li>A mock interview that adapts — if an answer is vague, you&apos;ll get a follow-up before it moves on</li>
              <li>A final report showing where you struggled, which resume claims need better explanations, and what to practice next</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
