"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Footer() {
  const isHome = usePathname() === "/"
  return (
    <footer
      className={
        isHome
          ? "w-full border-t border-border/40 bg-transparent py-8 md:py-12 mt-16 dark:border-white/10"
          : "w-full border-t border-border/40 bg-background py-8 md:py-12 mt-16"
      }
    >
      <div className="container max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="inline-block mb-4">
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
              FindUrAI
            </span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Learn anything with AI — turn your material into notes, flashcards and quizzes, and practice until it sticks.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-4 text-sm tracking-wider uppercase">Product</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/utilities" className="hover:text-primary transition-colors">Utilities</Link></li>
            <li><Link href="/pdf" className="hover:text-primary transition-colors">PDF Tools</Link></li>
            <li><Link href="/packs" className="hover:text-primary transition-colors">Prompt Packs</Link></li>
            <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-4 text-sm tracking-wider uppercase">Company</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="container max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} FindUrAI. All rights reserved.</p>
      </div>
    </footer>
  )
}
