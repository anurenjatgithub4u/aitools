import type { Metadata } from "next"
import { TOOL_DIRECTORY_ENABLED } from "@/lib/tools/config"

// Comparison permutations (?a=, ?b=) would otherwise be crawled as hundreds of
// near-duplicate pages. Canonical collapses them all to the base /compare URL;
// the base page itself stays indexable — while the tool directory is enabled.
export const metadata: Metadata = {
  title: "Compare AI Tools Side-by-Side",
  description: "Compare any two AI tools side-by-side — pricing, free plans, APIs, features, pros and cons — to pick the right one on FindurAI.",
  alternates: { canonical: "/compare" },
  robots: TOOL_DIRECTORY_ENABLED ? undefined : { index: false, follow: false },
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
