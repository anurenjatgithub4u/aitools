import { Metadata } from "next"
import { Mail, MessageSquare, Compass } from "lucide-react"
import { ContactForm } from "@/components/contact-form"

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with FindurAI for feedback, advertising requests, tool listing suggestions, or editorial questions.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-16 md:py-24">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Support & Partnerships</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            Get in Touch
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Have questions about our reviews, want to submit a new AI tool, or interested in advertising partnerships? We are here to help.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8 max-w-4xl mx-auto">
          {/* Contact Details Card */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-8 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md shadow-lg space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
              
              <h2 className="text-2xl font-bold mb-4">Direct Contact</h2>
              
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/15 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Email Us</h3>
                  <a href="mailto:anurenjatbusiness@gmail.com" className="text-foreground hover:text-primary transition-colors font-medium break-all">
                    anurenjatbusiness@gmail.com
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">We typically reply within 24-48 business hours.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/15 shrink-0">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Tool Submissions</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                    To list or edit your AI tool on FindUrAI, please click the <strong>Submit Tool</strong> button in the navigation header or write to our support email.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Simple Contact Form Presentation */}
          <div className="md:col-span-7">
            <div className="p-8 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md shadow-lg space-y-6">
              <h2 className="text-2xl font-bold">Send a Message</h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
