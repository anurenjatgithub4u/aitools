import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SubmitForm } from "@/components/products/submit-form"
import { PRODUCTS_ENABLED } from "@/lib/products/config"

export const metadata: Metadata = {
  title: "Submit Your Product",
  description:
    "Add your product to the FindurAI leaderboard for free. No payment, no approval queue — it goes live immediately and the community decides where it ranks.",
  alternates: { canonical: "/submit" },
}

export default function SubmitPage() {
  if (!PRODUCTS_ENABLED) notFound()

  return (
    <div className="min-h-screen bg-background py-14 md:py-20">
      <div className="container mx-auto max-w-xl px-4">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Submit your product
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            Free, instant, and open to anything you&apos;ve built. Fill this in and it&apos;s on the
            leaderboard straight away.
          </p>
        </div>

        <SubmitForm />
      </div>
    </div>
  )
}
