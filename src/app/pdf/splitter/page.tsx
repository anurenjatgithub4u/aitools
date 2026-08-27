import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { SplitterTool } from "./splitter-tool"

// Bare title only — the root layout's title template ("%s | FindurAI")
// already appends the brand; openGraph/twitter need it added explicitly.
const TITLE = "PDF Splitter — Split PDF Online"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION = "Split PDF files by page or range and download instantly — free, fast and no sign-up required."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/splitter" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/splitter" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function PdfSplitterPage() {
  return (
    <PdfToolLayout title="PDF Splitter" description="Split a PDF into individual pages or smaller documents.">
      <SplitterTool />
    </PdfToolLayout>
  )
}
