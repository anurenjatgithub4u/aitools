import { Metadata } from "next"
import { ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Privacy Policy of FindurAI. Learn how we handle cookies, tracking, and personal information on our AI directory platform.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-16 md:py-24">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Data Security</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: June 26, 2026</p>
        </div>

        {/* Content Box */}
        <div className="p-8 md:p-12 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md shadow-lg prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">1. Introduction</h2>
            <p>
              Welcome to FindUrAI. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy policy, please contact us at <a href="mailto:anurenjatbusiness@gmail.com" className="text-primary hover:underline font-semibold">anurenjatbusiness@gmail.com</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">2. Information We Collect</h2>
            <p>
              We collect information that you voluntarily provide to us when you register on our platform, submit AI tools, write reviews, or contact us. This may include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name and contact information (such as email address).</li>
              <li>Account credentials (usernames and passwords).</li>
              <li>Profile data (avatar, submitted tool listings, and public reviews).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">3. How We Use Your Information</h2>
            <p>
              We use personal information collected via our platform for a variety of business purposes, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To facilitate account creation and logon processes.</li>
              <li>To post user-submitted reviews and AI tool listings.</li>
              <li>To respond to user inquiries and offer support.</li>
              <li>To analyze site usage and improve platform navigation/features.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">4. Cookies and Tracking</h2>
            <p>
              We may use cookies and similar tracking technologies to access or store information. This helps us customize your user experience, remember your preferences, and understand how you interact with our tools and pages. You can modify your browser settings to decline cookies if you prefer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">5. Third-Party Websites</h2>
            <p>
              FindUrAI links to hundreds of external AI tool websites. We do not control and are not responsible for the privacy practices of third-party platforms. We recommend checking their individual policies when navigating away from our directory.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">6. Contact Us</h2>
            <p>
              If you have questions or comments about this policy, you can email us directly at: <a href="mailto:anurenjatbusiness@gmail.com" className="text-primary hover:underline font-semibold">anurenjatbusiness@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
