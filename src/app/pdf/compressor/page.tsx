import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { CompressorTool } from "./compressor-tool"

// "Balancing quality" rather than "best possible quality" — matches the
// honest, non-overpromising copy the tool itself uses (Low/Recommended/High
// levels, and an explicit "already optimized" message when compression
// wouldn't meaningfully help). See compressor-tool.tsx / spec §8.
// Bare title only — the root layout's title template ("%s | FindurAI")
// already appends the brand; openGraph/twitter need it added explicitly.
const TITLE = "PDF Compressor — Compress PDF Online"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION = "Compress PDF files online for free with FindurAI. Reduce file size while balancing quality — no sign-up required."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/compressor" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/compressor" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function PdfCompressorPage() {
  return (
    <PdfToolLayout title="PDF Compressor" description="Reduce PDF file size while keeping the best possible quality.">
      <CompressorTool />
    </PdfToolLayout>
  )
}
