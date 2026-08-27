import { Metadata } from "next"
import { Gauge } from "lucide-react"
import { TypingReadingTool } from "./typing-reading-tool"
import { breadcrumbLd, faqLd, jsonLdScript, absoluteUrl } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Typing Speed Test & Reading Speed Test",
  description: "Test and improve your typing speed, accuracy, reading speed, and comprehension with free interactive practice tools.",
  alternates: { canonical: "/utilities/typing-reading-speed" },
  openGraph: {
    title: "Typing Speed Test & Reading Speed Test | FindurAI",
    description: "Test and improve your typing speed, accuracy, reading speed, and comprehension with free interactive practice tools.",
    type: "website",
    url: "/utilities/typing-reading-speed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Typing Speed Test & Reading Speed Test | FindurAI",
    description: "Test and improve your typing speed, accuracy, reading speed, and comprehension with free interactive practice tools.",
  },
}

const FAQ = [
  {
    question: "What is a good typing speed?",
    answer:
      "It depends on context. Casual typists often fall somewhere in the 30–50 WPM range, while people who type for a living, such as transcriptionists or data-entry specialists, often type considerably faster with practice. Accuracy matters just as much as raw speed — a fast typist who has to stop and fix constant mistakes isn't actually faster in practice.",
  },
  {
    question: "How is WPM (words per minute) calculated?",
    answer:
      "The standard convention treats 5 characters as one \"word.\" WPM is calculated as (characters typed ÷ 5) ÷ minutes elapsed. This keeps the measurement consistent regardless of whether the text uses long or short words.",
  },
  {
    question: "Why does this tool ask comprehension questions after reading?",
    answer:
      "Reading speed on its own can be misleading — someone could scroll through a passage quickly without absorbing anything. Pairing words-per-minute with a short comprehension check gives a more honest picture of how effectively someone actually read the material.",
  },
  {
    question: "Is my typing and reading data sent anywhere?",
    answer:
      "No. Everything runs locally in your browser. Your typed text and practice history are stored on your own device and are not uploaded to a server.",
  },
]

export default function TypingReadingSpeedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90 py-12 md:py-20">
      <script {...jsonLdScript(breadcrumbLd([
        { name: "Utilities", path: "/utilities" },
        { name: "Typing & Reading Speed", path: "/utilities/typing-reading-speed" },
      ]))} />
      <script {...jsonLdScript(faqLd(FAQ))} />
      <script
        {...jsonLdScript({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Typing & Reading Speed",
          description: "Free interactive typing and reading speed practice tool with live WPM, accuracy, and comprehension tracking.",
          applicationCategory: "ProductivityApplication",
          operatingSystem: "Web",
          url: absoluteUrl("/utilities/typing-reading-speed"),
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        })}
      />

      <div className="container max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 backdrop-blur-sm">
            <Gauge className="h-3 w-3" />
            <span>Free Utility</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
            Typing & Reading Speed
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Practice. Measure. Improve. Track your typing speed, accuracy, reading speed, and comprehension — and see your progress over time.
          </p>
        </div>

        <TypingReadingTool />

        {/* SEO / explanatory content */}
        <div className="mt-20 max-w-3xl space-y-14">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">How typing speed is calculated</h2>
            <p className="text-muted-foreground leading-relaxed">
              This tool uses the standard typing-test convention: five characters count as one &quot;word.&quot; Your words-per-minute (WPM) score is calculated as the number of characters you&apos;ve typed, divided by five, divided by the minutes elapsed. Live WPM updates continuously while you type, and your final WPM is calculated the moment the test ends — either when you finish the text or when a timed test runs out. Accuracy is calculated separately, as the percentage of keystrokes that matched the expected character at the time you typed them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">What is WPM?</h2>
            <p className="text-muted-foreground leading-relaxed">
              WPM, or words per minute, is the most common way to measure typing speed. It&apos;s a useful shorthand because it normalizes for word length — typing &quot;the&quot; and typing &quot;extraordinary&quot; both count proportionally toward your total, based on character count rather than word count alone. WPM is widely used because it&apos;s easy to compare across different tests and different pieces of text, even though the underlying words themselves vary.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">What is a good typing speed?</h2>
            <p className="text-muted-foreground leading-relaxed">
              &quot;Good&quot; depends heavily on context. Someone typing casual messages doesn&apos;t need the same speed as someone whose job involves transcription or heavy data entry. What tends to matter more than a specific number is the relationship between speed and accuracy — typing quickly but making frequent errors you then have to fix often ends up slower in practice than typing at a steady, accurate pace. If you&apos;re not sure where you stand, the most useful comparison is against your own past sessions, not an arbitrary benchmark.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">How to improve typing speed</h2>
            <ul className="text-muted-foreground leading-relaxed list-disc list-outside pl-5 space-y-2">
              <li>Prioritize accuracy first — speed tends to follow naturally once you&apos;re consistently accurate.</li>
              <li>Use proper touch-typing technique, keeping your fingers on the home row instead of hunting for keys.</li>
              <li>Avoid looking at the keyboard while you type, even if it feels slower at first.</li>
              <li>Practice in short, regular sessions rather than occasional long ones — consistency builds muscle memory faster than intensity.</li>
              <li>Pay attention to which specific keys or letter combinations you consistently get wrong, and give those extra practice.</li>
              <li>Track your sessions over time so you can see whether your changes are actually working.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">How reading speed is calculated</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reading speed is calculated as the number of words in a passage divided by the number of minutes it took to read it. For example, a 500-word passage read in two-and-a-half minutes works out to 200 WPM. This tool starts the timer when you begin reading and stops it the moment you mark yourself done — but reading speed by itself doesn&apos;t tell you whether the reading was effective, which is why comprehension is measured alongside it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">What is a good reading speed?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reading speed varies widely depending on the type of material, how familiar you are with the topic, and what you&apos;re trying to get out of it. Skimming a news article and carefully working through a technical document are different tasks with different reasonable speeds. Rather than chasing a single target number, it&apos;s usually more useful to track how your speed and comprehension move together over time on similar material.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-3">How comprehension affects reading speed</h2>
            <p className="text-muted-foreground leading-relaxed">
              Speed and comprehension pull against each other. It&apos;s easy to move your eyes across a page quickly without actually absorbing what it says — which is exactly why this tool doesn&apos;t treat &quot;time to click Done&quot; as a meaningful score on its own. By asking a few comprehension questions after each passage, it gives a fuller picture: reading speed with comprehension is a genuine skill, while speed without comprehension is just skimming. The goal is to gradually increase your speed without your comprehension score dropping alongside it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Frequently asked questions</h2>
            <div className="space-y-6">
              {FAQ.map((item) => (
                <div key={item.question}>
                  <h3 className="font-semibold text-foreground mb-1.5">{item.question}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
