"use client"

import { useState } from "react"
import { Send, CheckCircle2 } from "lucide-react"

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-8 text-center space-y-4 animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Message Sent!</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Thank you for reaching out. We have received your message and our team will get back to you as soon as possible.
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</label>
          <input 
            type="text" 
            required
            placeholder="John" 
            className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</label>
          <input 
            type="text" 
            required
            placeholder="Doe" 
            className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
        <input 
          type="email" 
          required
          placeholder="john@example.com" 
          className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</label>
        <textarea 
          rows={4}
          required
          placeholder="How can we help you?" 
          className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-sm resize-none"
        ></textarea>
      </div>

      <button 
        type="submit"
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/10 hover:shadow-primary/20"
      >
        <Send className="h-4 w-4" />
        <span>Send Message</span>
      </button>
    </form>
  )
}
