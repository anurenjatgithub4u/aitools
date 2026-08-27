import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { MergerTool } from "./merger-tool"

// Bare title only — the root layout's title template ("%s | FindurAI")
// already appends the brand; openGraph/twitter need it added explicitly.
const TITLE = "PDF Merger — Merge PDFs Online"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION = "Merge multiple PDF files into one document in the order you choose — free, fast and no sign-up required."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/merger" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/merger" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function PdfMergerPage() {
  return (
    <PdfToolLayout title="PDF Merger" description="Combine multiple PDF files into one document.">
      <MergerTool />
    </PdfToolLayout>
  )
}
