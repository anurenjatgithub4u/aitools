import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { ImageToPdfTool } from "@/components/pdf-tools/image-to-pdf-tool"

// Bare title only — the root layout's title template ("%s | FindurAI")
// already appends the brand; openGraph/twitter need it added explicitly.
const TITLE = "PNG to PDF — Convert PNG to PDF Online"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION = "Convert one or more PNG images into a single PDF online, free and instantly. Processed entirely in your browser — nothing is ever uploaded."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/png-to-pdf" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/png-to-pdf" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function PngToPdfPage() {
  return (
    <PdfToolLayout
      title="PNG to PDF"
      description="Combine PNG images into a single PDF — right in your browser."
      privacyNote="Converted entirely in your browser. Your images are never uploaded."
    >
      <ImageToPdfTool defaultFormat="png" />
    </PdfToolLayout>
  )
}
