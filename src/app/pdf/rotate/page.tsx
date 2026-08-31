import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { RotateTool } from "./rotate-tool"

const TITLE = "Rotate PDF Pages — Free Online Tool"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION =
  "Rotate PDF pages online for free — fix sideways scans or flip individual pages 90°, 180°, or 270°. No sign-up required. Runs entirely in your browser."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/rotate" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/rotate" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function PdfRotatePage() {
  return (
    <PdfToolLayout
      title="Rotate PDF Pages"
      description="Rotate all pages or individual pages by 90°, 180°, or 270°. Fix sideways scans instantly."
      privacyNote="Runs entirely in your browser — your PDF is never uploaded."
    >
      <RotateTool />
    </PdfToolLayout>
  )
}
