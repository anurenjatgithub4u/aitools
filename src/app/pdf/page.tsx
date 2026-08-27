import { Metadata } from "next"
import { FileArchive, Scissors, Combine, FileImage, Images, FileCode, FileType, Wrench, ShieldCheck } from "lucide-react"
import { PdfToolCard } from "@/components/pdf-tools/pdf-tool-card"
import { PdfHeroVisual } from "@/components/pdf-tools/pdf-hero-visual"

// Bare title only — the root layout's title template ("%s | FindurAI")
// already appends the brand suffix. openGraph/twitter titles aren't
// affected by that template, so they need it added explicitly (same
// pattern as src/app/blog/page.tsx).
const TITLE = "Free PDF Tools — Compress, Split, Merge & Convert"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION =
  "Simple, fast PDF tools powered by FindurAI. Compress, split, merge and convert your PDF files quickly and securely — no sign-up required."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

// The central hub for every PDF tool. New tools only need a new card here
// plus a route; the shared upload/progress/result components are already
// built for it (see src/lib/pdf-tools/). Two card families are each really
// several routes sharing one tool component with a switchable
// format/setting inside, kept as one card apiece so the grid doesn't balloon:
//  - PDF to Image → /pdf/to-jpg, /pdf/to-png, /pdf/to-webp
//  - Image to PDF → /pdf/jpg-to-pdf, /pdf/png-to-pdf, /pdf/webp-to-pdf
// PowerPoint → PDF and Excel → PDF are deliberately not here yet — neither
// has a viable client-side rendering path with the libraries already in this
// app, and building one (headless-browser rendering, or a real spreadsheet
// layout engine) is a separate infrastructure decision.
export default function PdfUtilitiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-12 mb-12 md:mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
              <Wrench className="h-3 w-3" />
              <span>PDF Utilities</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
              Simple tools for working with PDFs
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Compress, split, merge and convert PDFs instantly.{" "}
              <span className="text-foreground font-medium">No sign-up required.</span>
            </p>
          </div>

          <PdfHeroVisual />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PdfToolCard
            icon={FileArchive}
            tint="blue"
            title="PDF Compressor"
            description="Reduce file size"
            supportedInfo="Single PDF · up to 25 MB"
            href="/pdf/compressor"
            ctaLabel="Compress PDF"
          />
          <PdfToolCard
            icon={Scissors}
            tint="amber"
            title="PDF Splitter"
            description="Extract pages"
            supportedInfo="Single PDF · up to 25 MB"
            href="/pdf/splitter"
            ctaLabel="Split PDF"
          />
          <PdfToolCard
            icon={Combine}
            tint="violet"
            title="PDF Merger"
            description="Combine files"
            supportedInfo="Up to 20 PDFs · 25 MB each"
            href="/pdf/merger"
            ctaLabel="Merge PDF"
          />
          <PdfToolCard
            icon={FileImage}
            tint="emerald"
            title="PDF to Image"
            description="Export as JPG, PNG or WEBP"
            supportedInfo="Runs in your browser · never uploaded"
            href="/pdf/to-jpg"
            ctaLabel="Convert PDF"
          />
          <PdfToolCard
            icon={Images}
            tint="cyan"
            title="Image to PDF"
            description="Combine JPG, PNG or WEBP into a PDF"
            supportedInfo="Runs in your browser · never uploaded"
            href="/pdf/jpg-to-pdf"
            ctaLabel="Convert to PDF"
          />
          <PdfToolCard
            icon={FileCode}
            tint="rose"
            title="HTML to PDF"
            description="Turn an HTML file into a PDF"
            supportedInfo="Runs in your browser · never uploaded"
            href="/pdf/html-to-pdf"
            ctaLabel="Convert to PDF"
          />
          <PdfToolCard
            icon={FileType}
            tint="indigo"
            title="Word to PDF"
            description="Turn a .docx document into a PDF"
            supportedInfo="Runs in your browser · never uploaded"
            href="/pdf/word-to-pdf"
            ctaLabel="Convert to PDF"
          />
        </div>

        <div className="flex items-center justify-center gap-3 mt-12 md:mt-14 text-center">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Private by default.</span>{" "}
            Your files are processed securely and are not permanently stored.
          </p>
        </div>
      </div>
    </div>
  )
}
