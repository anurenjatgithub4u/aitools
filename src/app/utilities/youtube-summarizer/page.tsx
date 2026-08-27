import { Metadata } from "next"
import { MonitorPlay } from "lucide-react"
import { YoutubeTool } from "./youtube-tool"
import { absoluteUrl, breadcrumbLd, faqLd, jsonLdScript } from "@/lib/seo"
import {
  MAX_ANONYMOUS_VIDEOS_PER_DAY,
  MAX_AUTH_VIDEOS_PER_DAY,
} from "@/lib/youtube-study/config"

const TITLE = "Free YouTube Summarizer – Video to Notes & Study Guide"
const DESCRIPTION =
  "Free YouTube summarizer. Paste any video URL for structured notes, a study guide, or a ChatGPT or Claude prompt. No sign-up. Videos up to 1 hour."

export const metadata: Metadata = {
  // Kept short because the root layout appends " | FindurAI" — a longer title
  // gets truncated in results, cutting off the brand.
  title: "YouTube Summarizer – Video to Notes",
  description: DESCRIPTION,
  alternates: { canonical: "/utilities/youtube-summarizer" },
  // Ordered head term first. These mirror the H2s below, so the page body
  // actually supports what the metadata claims.
  keywords: [
    "youtube summarizer",
    "summarize youtube video",
    "youtube video summarizer",
    "youtube to notes",
    "youtube transcript summarizer",
    "youtube video to text",
    "youtube study guide generator",
    "summarize youtube video with ai",
    "youtube to chatgpt prompt",
    "free youtube summarizer",
  ],
  openGraph: {
    title: `${TITLE} | FindurAI`,
    description: DESCRIPTION,
    type: "website",
    url: "/utilities/youtube-summarizer",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | FindurAI`,
    description: DESCRIPTION,
  },
}

// Answers stay factually tied to the implementation — the limits, storage and
// transcript answers in particular must never drift from what the code does.
const FAQ = [
  {
    question: "How do I summarize a YouTube video for free?",
    answer:
      "Paste the video URL, press Analyze Video, then choose Smart Notes. It is free and needs no account. The tool reads the video's captions, extracts the concepts, definitions and examples, and writes structured notes with timestamps linking back to the moment each point was made.",
  },
  {
    question: "How long a YouTube video can it summarize?",
    answer:
      "Yes — videos must be 1 hour or shorter. The limit is checked on our server before any processing starts, and if a video is over it you're told the detected duration rather than being left waiting. Longer support may come once we know the real usage numbers.",
  },
  {
    question: "Can it summarize a video without captions?",
    answer:
      "The tool tells you plainly that no usable transcript was found and stops. It will not generate notes from a video it couldn't read — inventing content would be worse than returning nothing.",
  },
  {
    question: "Does the YouTube summarizer work with Shorts?",
    answer:
      "Yes, provided the Short has captions and enough spoken content. Very short clips with little speech are rejected with an explanation rather than producing a thin, unreliable summary.",
  },
  {
    question: "What can I create from a YouTube video?",
    answer:
      "Smart Notes, a Study Guide, a ChatGPT prompt and a Claude prompt. Key Takeaways, Quiz, Flashcards and Playbook are designed and coming next. Switching between output types on the same video is fast, because the video is only analysed once.",
  },
  {
    question: "What's the difference between the ChatGPT and Claude prompts?",
    answer:
      "Both embed the extracted knowledge so the assistant has the material without the video. The ChatGPT version is written for interactive back-and-forth teaching and exercises; the Claude version leans on long-context synthesis, connecting ideas and reasoning about trade-offs.",
  },
  {
    question: "Is this YouTube summarizer really free?",
    answer: `Yes. You can analyse ${MAX_ANONYMOUS_VIDEOS_PER_DAY} videos per day without an account, or ${MAX_AUTH_VIDEOS_PER_DAY} per day signed in. Generating a second output from a video you've already analysed is cheaper and counts against a separate, higher allowance.`,
  },
  {
    question: "Do you store my video transcripts?",
    answer:
      "Raw transcripts are treated as temporary processing data and expire quickly. What's kept is the compact knowledge summary derived from the video, so that asking for a different output later doesn't mean re-processing the whole thing.",
  },
]

const STEPS = [
  { title: "Paste the video URL", body: "Any youtube.com/watch, youtu.be or Shorts link, up to 1 hour." },
  { title: "We check it first", body: "Duration, availability and captions are verified before any AI runs." },
  { title: "Choose what to create", body: "Smart Notes, a Study Guide, or a ChatGPT or Claude prompt." },
  { title: "Watch it work", body: "Real progress stages — validation, transcript, extraction, generation." },
  { title: "Copy, download or keep", body: "Export as Markdown, or switch output type without re-processing." },
]

export default function YoutubeToKnowledgePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <script
        {...jsonLdScript([
          breadcrumbLd([
            { name: "Utilities", path: "/utilities" },
            { name: "YouTube Summarizer", path: "/utilities/youtube-summarizer" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "YouTube Summarizer",
            description: DESCRIPTION,
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            url: absoluteUrl("/utilities/youtube-summarizer"),
            // No aggregateRating: Google requires ratings from genuine user
            // reviews, and there are none to report for this tool.
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          faqLd(FAQ),
        ])}
      />

      <div className="container max-w-5xl mx-auto px-4">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <MonitorPlay className="h-3 w-3" aria-hidden="true" />
            <span>Free · No Sign-Up</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            Summarize Any YouTube Video Into Notes
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Paste a YouTube video URL and get structured notes, a study guide, or a ready-to-use
            ChatGPT or Claude prompt — built from what the video actually says.
          </p>
        </div>

        <YoutubeTool />

        {/* ---------------- SEO content ---------------- */}
        <div className="mt-20 max-w-3xl space-y-12">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              How to Summarize a YouTube Video
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Paste the video URL, press Analyze Video, then pick what you want. The tool reads the
              video&apos;s captions, works out what was actually taught, and rebuilds it as material
              you can use. No sign-up, no extension, and nothing to install.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              A conference talk, lecture or tutorial can cost you an hour and leave you with nothing
              to revise from — and rewatching to find one explanation is worse. Summarising it gives
              you something you can actually keep: notes to read, a guide to study from, or a prompt
              that hands the whole video to ChatGPT or Claude so you can ask follow-up questions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">YouTube Video to Notes</h2>
            <p className="text-muted-foreground leading-relaxed">
              Notes follow the structure of the talk rather than flattening it into bullet points: a
              short summary, then sections matching how the speaker actually moved through the
              material, with key terms defined and the important points called out. Where a concept
              can be placed in time, the heading carries a timestamp that links straight back to that
              moment in the video — so checking a claim against the source takes one click.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">YouTube to Study Guide</h2>
            <p className="text-muted-foreground leading-relaxed">
              The study guide is built to be revised from without the video open. It opens with what
              you should be able to do after working through it, explains each core concept in plain
              language, tabulates the key terms, and finishes with questions you can answer from the
              guide itself — answers included at the end, so you can attempt them first.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              YouTube to ChatGPT or Claude Prompt
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Rather than pasting a raw transcript into a chat window and hoping, this produces a
              compact, ready-to-use prompt with the video&apos;s knowledge already embedded. The
              ChatGPT version is written for interactive teaching — questions, exercises, and
              iterative practice. The Claude version leans on long-context synthesis: connecting
              ideas across the whole talk, reasoning about trade-offs, and surfacing what the material
              leaves unresolved. Both instruct the assistant to separate what came from the video from
              what it&apos;s adding itself.
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
            <h2 className="text-2xl font-bold tracking-tight mb-3">Is the Summary Accurate?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Notes are only useful if they reflect what was actually said. Every extraction step is
              instructed to work strictly from the transcript — not to fill gaps from general
              knowledge, and to say when the video doesn&apos;t cover something rather than inventing
              an answer. Opinions are attributed to the speaker rather than stated as fact. Before any
              of that, the transcript is checked for quality: if a video is mostly music, mostly
              silence, or too short to summarise honestly, you&apos;re told so instead of being handed
              a confident-sounding summary of nothing. Even so, AI makes mistakes — the timestamps are
              there so you can check anything you rely on.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-6">YouTube Summarizer FAQ</h2>
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
