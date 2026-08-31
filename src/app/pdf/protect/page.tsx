import { Metadata } from "next"
import { PdfToolLayout } from "@/components/pdf-tools/pdf-tool-layout"
import { ProtectTool } from "./protect-tool"

const TITLE = "Password Protect PDF — Free Online Tool"
const SOCIAL_TITLE = `${TITLE} | FindurAI`
const DESCRIPTION =
  "Password protect your PDF online for free. Add a password to keep your PDF secure — no sign-up required. Files are processed securely and never stored."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pdf/protect" },
  openGraph: { title: SOCIAL_TITLE, description: DESCRIPTION, type: "website", url: "/pdf/protect" },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
}

export default function PdfProtectPage() {
  return (
    <PdfToolLayout
      title="Password Protect PDF"
      description="Add a password to your PDF to restrict who can open it. Files are encrypted server-side and immediately discarded."
    >
      <ProtectTool />
    </PdfToolLayout>
  )
}
