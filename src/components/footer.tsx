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
            Discover, compare, and find the perfect AI tools for your next project. We help you navigate the AI revolution.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-4 text-sm tracking-wider uppercase">Categories</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/search?category=AI+Writing" className="hover:text-primary transition-colors">AI Writing</Link></li>
            <li><Link href="/search?category=AI+Image" className="hover:text-primary transition-colors">AI Image</Link></li>
            <li><Link href="/search?category=AI+Video" className="hover:text-primary transition-colors">AI Video</Link></li>
            <li><Link href="/search?category=AI+Coding" className="hover:text-primary transition-colors">AI Coding</Link></li>
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
