import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { HtmlToPdfTool } from "@/components/pdf-tools/html-to-pdf-tool"

// Bare title only — the root layout's title template ("%s | FindurAI")
// already appends the brand; openGraph/twitter need it added explicitly.
const TITLE = "HTML to PDF — Convert HTML to PDF Online"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION = "Convert an HTML file into a PDF online, free and instantly. Processed entirely in your browser — nothing is ever uploaded."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/html-to-pdf" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/html-to-pdf" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function HtmlToPdfPage() {
  return (
    <PdfToolLayout
      title="HTML to PDF"
      description="Convert an HTML file into a PDF — right in your browser."
      privacyNote="Converted entirely in your browser. Your file is never uploaded."
    >
      <HtmlToPdfTool />
    </PdfToolLayout>
  )
}
