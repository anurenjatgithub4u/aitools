import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { PdfToImageTool } from "@/components/pdf-tools/pdf-to-image-tool"

// Bare title only — the root layout's title template ("%s | FindurAI")
// already appends the brand; openGraph/twitter need it added explicitly.
const TITLE = "PDF to WEBP — Convert PDF to WEBP Online"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION = "Convert PDF pages to modern, compact WEBP images online, free and instantly. Processed entirely in your browser — nothing is ever uploaded."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/to-webp" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/to-webp" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function PdfToWebpPage() {
  return (
    <PdfToolLayout
      title="PDF to WEBP"
      description="Convert PDF pages into WEBP images — right in your browser."
      privacyNote="Converted entirely in your browser. Your PDF is never uploaded."
    >
      <PdfToImageTool defaultFormat="webp" />
    </PdfToolLayout>
  )
}
