import { Metadata } from "next"
import { BookOpen } from "lucide-react"
import { PdfStudyTool } from "./pdf-study-tool"
import { absoluteUrl, breadcrumbLd, faqLd, jsonLdScript } from "@/lib/seo"
import { MAX_PDF_PAGES } from "@/lib/pdf-study/config"

const TITLE = "PDF to Notes, Flashcards & Questions – Free AI Study Tool"
const DESCRIPTION =
  "Turn a PDF into study notes, flashcards, questions and quizzes with AI. Upload your document and generate useful study materials in seconds."

export const metadata: Metadata = {
  title: "PDF to Notes, Flashcards & Questions",
  description: DESCRIPTION,
  alternates: { canonical: "/utilities/pdf-to-study" },
  keywords: [
    "PDF to notes",
    "PDF to flashcards",
    "PDF question generator",
    "PDF to questions and answers",
    "PDF study guide generator",
    "generate questions from PDF",
    "AI PDF study tool",
    "PDF quiz generator",
  ],
  openGraph: {
    title: `${TITLE} | FindurAI`,
    description: DESCRIPTION,
    type: "website",
    url: "/utilities/pdf-to-study",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | FindurAI`,
    description: DESCRIPTION,
  },
}

// Answers are kept factually accurate to the implementation — the storage and
// pricing answers in particular must never drift from what the code does.
const FAQ = [
  {
    question: "Can I turn a PDF into notes?",
    answer:
      "Yes. Upload a text-based PDF, choose Notes, and pick how much detail you want — quick, standard or detailed. You'll get structured notes with an overview, topic sections, key points, definitions, examples and key takeaways.",
  },
  {
    question: "Can I create flashcards from a PDF?",
    answer:
      "Yes. Choose Flashcards and pick 10, 20, 30 or 50 cards. Each card tests a single concept drawn from your document, and you can flip, shuffle, and mark cards as known or for review. Flashcards can be exported as CSV for Anki or Quizlet.",
  },
  {
    question: "Can I generate questions from a PDF?",
    answer:
      "Yes. Choose Questions & Answers to get study questions with model answers, mixing recall, conceptual, application, comparison and explanation questions. You can set the difficulty to easy, medium, hard or mixed.",
  },
  {
    question: "Can I create a quiz from a PDF?",
    answer:
      "Yes. Choose Quiz to get an interactive multiple-choice quiz. Questions are shown one at a time, the correct answer stays hidden until you submit, and each answer comes with an explanation. You get a score at the end and can review every answer or retry.",
  },
  {
    question: "What type of PDFs are supported?",
    answer:
      "Text-based PDFs work best — anything where you can select the text in a normal PDF reader. Scanned or photographed documents are image-only, so there's no text to read; the tool will tell you when that's the case rather than producing made-up material. OCR is not currently supported.",
  },
  {
    question: "Is there a PDF size limit?",
    answer: `Yes. PDFs must be 25 MB or smaller and ${MAX_PDF_PAGES} pages or fewer, and you can generate from one PDF at a time. If your document is over either limit, the tool tells you exactly which limit it exceeded instead of silently cutting it short.`,
  },
  {
    question: "Are my PDFs stored?",
    answer:
      "No. Your PDF is uploaded, its text is read on our server, and the file itself is discarded in the same request — it is never written to disk or to any storage bucket. The extracted text is used only to generate the study materials you asked for, and your generated materials are not saved on our servers either, so download or copy anything you want to keep.",
  },
  {
    question: "Is the tool free?",
    answer:
      "Yes. You can run 5 generations per day without an account, or 20 per day when signed in to FindurAI. A Study Pack counts as 3 generations because it produces four sets of material.",
  },
]

const STEPS = [
  { title: "Upload your PDF", body: "Drag in a text-based PDF up to 25 MB." },
  { title: "Choose what to generate", body: "Notes, flashcards, questions, a quiz — or a full study pack." },
  { title: "Customize it", body: "Set the detail level, difficulty and how many items you want." },
  { title: "Generate", body: "The AI reads your document and builds the material from it." },
  { title: "Study, copy or export", body: "Work through it in the browser, or download it as Markdown, text or CSV." },
]

export default function PdfToStudyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <script
        {...jsonLdScript([
          breadcrumbLd([
            { name: "Utilities", path: "/utilities" },
            { name: "PDF to Notes, Flashcards & Questions", path: "/utilities/pdf-to-study" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "PDF to Notes, Flashcards & Questions",
            description: DESCRIPTION,
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            url: absoluteUrl("/utilities/pdf-to-study"),
            // No aggregateRating: Google requires ratings to come from genuine
            // user reviews, and there are none to report for this tool.
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          faqLd(FAQ),
        ])}
      />

      <div className="container max-w-5xl mx-auto px-4">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            <span>Study Tools</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            Turn PDFs into Study Materials
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Upload a PDF and turn it into notes, flashcards, questions and quizzes with AI.
          </p>
        </div>

        <PdfStudyTool />

        {/* ---------------- SEO content ---------------- */}
        <div className="mt-20 max-w-3xl space-y-12">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">Turn Any PDF Into Study Materials</h2>
            <p className="text-muted-foreground leading-relaxed">
              Lecture slides, textbook chapters, research papers, training manuals and course handouts
              all arrive as PDFs — and none of them are built for revision. This tool reads your
              document and rebuilds it as material you can actually study from: structured notes to
              read, flashcards to drill, questions to answer, and a quiz to check whether any of it
              stuck. Everything is generated from your document alone, so what you revise is what
              you&apos;ll be examined on, not a general summary of the topic.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">Generate Notes from a PDF</h2>
            <p className="text-muted-foreground leading-relaxed">
              Notes are organised the way a good set of revision notes should be — an overview, then
              topic sections with key points, definitions of the terms that matter, examples and
              formulas where the document contains them, and a short list of key takeaways at the
              end. Choose <strong>Quick</strong> for a tight summary of the main concepts,{" "}
              <strong>Standard</strong> for balanced notes, or <strong>Detailed</strong> when you want
              definitions, worked examples and the relationships between concepts spelled out. Where
              page tracking is reliable, each section shows the pages it came from so you can check
              anything against the original.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">Create Flashcards from a PDF</h2>
            <p className="text-muted-foreground leading-relaxed">
              Flashcards are built one concept at a time, spread across the different sections of your
              document rather than clustered on whichever part came first. Near-duplicate cards are
              removed automatically, so you won&apos;t get &ldquo;What is photosynthesis?&rdquo; and
              &ldquo;Define photosynthesis.&rdquo; as two separate cards. Flip through them in the
              browser, shuffle the deck, mark cards as known or for review — or export the set as CSV
              and import it into Anki or Quizlet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">Generate Questions and Answers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Question sets mix the kinds of question you&apos;re likely to face: straight recall,
              conceptual understanding, applying an idea, comparing two concepts, and explaining
              something in your own words. Each comes with a model answer you can check yourself
              against, tagged with its difficulty and topic, and collapsible so you can attempt a
              question before revealing the answer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">Create a Quiz from a PDF</h2>
            <p className="text-muted-foreground leading-relaxed">
              The quiz is interactive: one multiple-choice question at a time, four options, and no
              peeking — the correct answer stays hidden until you submit. After each answer you get
              an explanation of why the right option is right, and at the end you get your score, the
              option to review every question, and the option to try again.
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
            <h2 className="text-2xl font-bold tracking-tight mb-3">Built to stay accurate</h2>
            <p className="text-muted-foreground leading-relaxed">
              Study material is only useful if it&apos;s faithful to the source. Every generation is
              instructed to work strictly from your document — not to fill gaps from general
              knowledge, and to say when the document doesn&apos;t cover something rather than
              inventing an answer. Page references are only shown when the page numbers can actually
              be traced back through the extraction, never guessed. Even so, AI makes mistakes: check
              anything you&apos;re relying on against the original document.
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
