import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { WordToPdfTool } from "@/components/pdf-tools/word-to-pdf-tool"

// Bare title only — the root layout's title template ("%s | FindurAI")
// already appends the brand; openGraph/twitter need it added explicitly.
const TITLE = "Word to PDF — Convert DOCX to PDF Online"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION = "Convert a Word (.docx) document into a PDF online, free and instantly. Processed entirely in your browser — nothing is ever uploaded."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/word-to-pdf" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/word-to-pdf" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function WordToPdfPage() {
  return (
    <PdfToolLayout
      title="Word to PDF"
      description="Convert a Word document into a PDF — right in your browser."
      privacyNote="Converted entirely in your browser. Your file is never uploaded."
    >
      <WordToPdfTool />
    </PdfToolLayout>
  )
}
