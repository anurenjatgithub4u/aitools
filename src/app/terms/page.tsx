import { Metadata } from "next"
import { Scale } from "lucide-react"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Terms of Service for using FindurAI. Understand our listing guidelines, review policies, and legal disclaimers.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-16 md:py-24">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <Scale className="h-3.5 w-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: June 26, 2026</p>
        </div>

        {/* Content Box */}
        <div className="p-8 md:p-12 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md shadow-lg prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">1. Agreement to Terms</h2>
            <p>
              By accessing or using FindUrAI, you agree to be bound by these Terms of Service and all applicable laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">2. Directory Listings & User Content</h2>
            <p>
              FindUrAI provides a directory of artificial intelligence tools. Users may submit tools, descriptions, pricing information, and reviews. 
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Users are responsible for ensuring their submissions do not infringe on copyrights or intellectual property.</li>
              <li>We reserve the right to review, edit, or delete any listing or review at our sole discretion without notice.</li>
              <li>The views expressed in user reviews do not represent the opinions of FindUrAI.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">3. Accuracy of Materials</h2>
            <p>
              The materials appearing on FindUrAI could include technical, typographical, or photographic errors. We do not warrant that any of the materials on our platform are fully accurate, complete, or current. We may make changes to the materials contained on the website at any time without notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">4. Disclaimer</h2>
            <p>
              The services and directory listings on FindUrAI are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">5. Modifications to Terms</h2>
            <p>
              We may revise these Terms of Service for our website at any time without notice. By using this website, you are agreeing to be bound by the then-current version of these Terms of Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">6. Contact Information</h2>
            <p>
              If you have any questions or require clarification regarding these terms, please contact us at: <a href="mailto:anurenjatbusiness@gmail.com" className="text-primary hover:underline font-semibold">anurenjatbusiness@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
