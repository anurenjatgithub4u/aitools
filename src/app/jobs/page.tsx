import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Briefcase } from "lucide-react"
import { JobsTool } from "./jobs-tool"
import { absoluteUrl, breadcrumbLd, faqLd, jsonLdScript } from "@/lib/seo"
import { JOBS_FEATURE_ENABLED } from "@/lib/jobs/config"

const TITLE = "AI Job Search – Match Your Resume to Real Jobs"
const DESCRIPTION =
  "Upload your resume or describe the role you want. Get an AI resume score, then see matching jobs from company career pages with a match score for each. Free."

export const metadata: Metadata = {
  title: "AI Job Search – Resume to Job Matching",
  description: DESCRIPTION,
  alternates: { canonical: "/jobs" },
  robots: JOBS_FEATURE_ENABLED ? undefined : { index: false, follow: false },
  keywords: [
    "ai job search",
    "resume job matching",
    "match resume to jobs",
    "ai resume score",
    "find jobs with ai",
    "resume analyzer",
    "job match score",
    "ai job finder",
  ],
  openGraph: {
    title: `${TITLE} | FindurAI`,
    description: DESCRIPTION,
    type: "website",
    url: "/jobs",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | FindurAI`,
    description: DESCRIPTION,
  },
}

// Answers stay tied to what the code actually does — particularly the source
// coverage and the "we don't apply for you" answers, which must never drift.
const FAQ = [
  {
    question: "How does AI job matching work?",
    answer:
      "Upload a resume or describe the role you want. AI builds a structured profile from it — title, seniority, years of experience, skills and locations — then that profile is compared against jobs we've discovered. Each job gets a match score built from skills overlap, experience fit, job title, location and seniority.",
  },
  {
    question: "Where do the jobs come from?",
    answer:
      "Directly from company career pages and the applicant tracking systems behind them — Greenhouse, Lever and Ashby. That means the apply link takes you to the company's own application form rather than an aggregator, and postings tend to be fresher with fewer duplicates. It is not every job on the internet, and we don't claim it is.",
  },
  {
    question: "What does the match score mean?",
    answer:
      "It's how closely a job's stated requirements line up with your profile — weighted across skills, experience, title, location and seniority. It is not a prediction of whether you'll be hired. Treat it as a way to rank and triage, not as a verdict.",
  },
  {
    question: "Does FindUrAI apply to jobs for me?",
    answer:
      "No. Apply Now opens the original posting on the company's site, and you apply there. We record that the link was opened so you can track what you've looked at, but we never claim an application was submitted.",
  },
  {
    question: "Do I need to upload a resume?",
    answer:
      "No. You can describe what you're looking for in plain language instead — for example, 'Android Developer with 3 years of Kotlin experience, Bangalore or remote'. Uploading a resume additionally gives you a resume score and improvement suggestions.",
  },
  {
    question: "Is my resume stored?",
    answer:
      "No. The file is read on our server to extract text, the profile is built from that text, and the file is discarded in the same request. It is never written to disk or to any storage bucket.",
  },
  {
    question: "How fresh are the jobs?",
    answer:
      "Every job shows when it was posted and when we last verified it — two different things. A job that disappears from its source isn't marked expired immediately, because sources fail temporarily; it takes repeated misses before we stop showing it.",
  },
  {
    question: "Is it free?",
    answer:
      "Yes. Anonymous visitors get 3 searches and 3 resume analyses per day, and signed-in users get considerably more. Signing in also lets you save jobs.",
  },
]

const STEPS = [
  { title: "Upload a resume or describe the role", body: "PDF or DOCX, or just type what you're looking for." },
  { title: "AI builds your profile", body: "Title, seniority, experience, skills and locations — extracted, not guessed." },
  { title: "We search company career pages", body: "Direct from the ATS platforms companies actually post on." },
  { title: "Every job gets a match score", body: "With why you match, and which skills you're missing." },
  { title: "Apply on the company's own site", body: "Apply Now opens the original posting. Save anything worth returning to." },
]

export default function JobsPage() {
  // Paused feature: 404 rather than render. Keeping the code costs nothing —
  // an unreferenced route isn't bundled into any other page.
  if (!JOBS_FEATURE_ENABLED) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <script
        {...jsonLdScript([
          breadcrumbLd([{ name: "AI Job Search", path: "/jobs" }]),
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "FindurAI Job Search",
            description: DESCRIPTION,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: absoluteUrl("/jobs"),
            // No aggregateRating: Google requires ratings from genuine user
            // reviews, and there are none to report.
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          faqLd(FAQ),
        ])}
      />

      <div className="container max-w-4xl mx-auto px-4">
        <div className="mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <Briefcase className="h-3 w-3" aria-hidden="true" />
            <span>Free · No Sign-Up</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            Match Your Resume to Real Jobs
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Upload your resume or describe the role you want. Get a resume score, then see matching
            jobs from company career pages — with a match score, why you match, and what you&apos;re
            missing.
          </p>
        </div>

        <JobsTool />

        {/* ---------------- SEO content ---------------- */}
        <div className="mt-20 max-w-3xl space-y-12">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">How AI Job Matching Works</h2>
            <p className="text-muted-foreground leading-relaxed">
              Most job boards match on keywords, which is why searching &ldquo;React developer&rdquo;
              returns roles wanting six years of native iOS. This works differently: AI reads your
              resume into a structured profile — the title you actually fit, your real seniority,
              the technologies you&apos;ve genuinely used — and scores each job against it across
              skills, experience, title, location and seniority. You see the score, the reasons
              behind it, and the requirements you don&apos;t meet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">Jobs Straight From Company Career Pages</h2>
            <p className="text-muted-foreground leading-relaxed">
              Listings come from the applicant tracking systems companies post on themselves —
              Greenhouse, Lever, Ashby. Three things follow from that. The apply link goes to the
              company&apos;s own form rather than through an aggregator. Postings are fresher,
              because there&apos;s no syndication delay. And there are far fewer duplicates and
              recruiter reposts to wade through. The trade-off is honest: this covers the companies
              we monitor, not every employer that exists.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">Your Resume Score</h2>
            <p className="text-muted-foreground leading-relaxed">
              Uploading a resume also gets you a score out of 100, broken into ATS compatibility,
              skills, experience, keywords, formatting, impact and job targeting — plus specific
              strengths, concrete improvements, and the keywords worth adding for the roles
              you&apos;re targeting. The scoring is deliberately not generous: a number that flatters
              you is no use when a recruiter is reading the same document.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">How It Works</h2>
            <ol className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <span>
                    <strong className="block text-foreground">{step.title}</strong>
                    <span className="text-muted-foreground leading-relaxed">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">What We Don&apos;t Do</h2>
            <p className="text-muted-foreground leading-relaxed">
              We don&apos;t apply on your behalf. Apply Now opens the real posting and you complete
              the application there — no tool can reliably submit for you, and most platforms
              prohibit it. We also don&apos;t present the match score as a hiring probability; it
              reflects how well a job&apos;s stated requirements line up with your profile, nothing
              more. And we don&apos;t claim to index the whole job market. Being clear about the
              limits is what makes the parts that do work trustworthy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-6">Frequently asked questions</h2>
            <dl className="space-y-6">
              {FAQ.map((item) => (
                <div key={item.question}>
                  <dt className="font-semibold text-foreground mb-1.5">{item.question}</dt>
                  <dd className="text-muted-foreground leading-relaxed">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
