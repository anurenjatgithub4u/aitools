import type { Metadata } from "next"

// Comparison permutations (?a=, ?b=) would otherwise be crawled as hundreds of
// near-duplicate pages. Canonical collapses them all to the base /compare URL;
// the base page itself stays indexable.
export const metadata: Metadata = {
  title: "Compare AI Tools Side-by-Side",
  description: "Compare any two AI tools side-by-side — pricing, free plans, APIs, features, pros and cons — to pick the right one on FindurAI.",
  alternates: { canonical: "/compare" },
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
