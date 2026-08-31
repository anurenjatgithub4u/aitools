import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { PageNumbersTool } from "./page-numbers-tool"

const TITLE = "Add Page Numbers to PDF — Free Online Tool"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION =
  "Add page numbers to your PDF instantly, free and online. Choose position, format, and starting number. No sign-up required — runs entirely in your browser."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/page-numbers" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/page-numbers" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function PdfPageNumbersPage() {
  return (
    <PdfToolLayout
      title="Add Page Numbers to PDF"
      description="Stamp page numbers onto every page of your PDF — choose position, format, and starting number."
      privacyNote="Runs entirely in your browser — your PDF is never uploaded."
    >
      <PageNumbersTool />
    </PdfToolLayout>
  )
}
