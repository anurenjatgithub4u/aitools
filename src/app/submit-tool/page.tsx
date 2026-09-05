"use client"

// Metadata for client components must live in a sibling layout.tsx (see ./layout.tsx).

import { useState, useEffect, FormEvent } from "react"
import { notFound } from "next/navigation"
import { Sparkles, CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { TOOL_DIRECTORY_ENABLED } from "@/lib/tools/config"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const FALLBACK_CATEGORIES = [
  "AI Chatbot", "AI Coding", "AI Writing", "Image Generation", "AI Video",
  "Voice AI", "Audio", "Developer Tools", "Productivity", "Automation",
  "Research", "Education", "Marketing", "AI Agents", "AI Search",
]

const PRICING_OPTIONS = ["Free", "Freemium", "Paid", "Free Trial"]
const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Professional"]

interface FormState {
  name: string
  website: string
  category: string
  description: string
  best_for: string
  pricing: string
  difficulty: string
  free_plan: boolean
  api: boolean
  mobile: boolean
  opensource: boolean
  tags: string
  features: string
  submitterName: string
  submitterEmail: string
}

const initialState: FormState = {
  name: "",
  website: "",
  category: "",
  description: "",
  best_for: "",
  pricing: "Free Trial",
  difficulty: "Beginner",
  free_plan: false,
  api: false,
  mobile: false,
  opensource: false,
  tags: "",
  features: "",
  submitterName: "",
  submitterEmail: "",
}

export default function SubmitToolPage() {
  if (!TOOL_DIRECTORY_ENABLED) notFound()

  const [form, setForm] = useState<FormState>(initialState)
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    fetch("/api/tools")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const unique = Array.from(new Set(data.map((t: any) => t.category).filter(Boolean))) as string[]
          if (unique.length > 0) setCategories(unique.sort())
        }
      })
      .catch(() => { /* keep fallback categories */ })
  }, [])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validate = (): string | null => {
    if (!form.name.trim()) return "Tool name is required."
    if (!form.website.trim()) return "Website URL is required."
    if (!form.category.trim()) return "Please select a category."
    if (form.description.trim().length < 20) return "Description must be at least 20 characters."
    if (form.submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.submitterEmail)) {
      return "Please enter a valid email address."
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setStatus("error")
      setErrorMessage(validationError)
      return
    }

    setStatus("submitting")
    setErrorMessage("")

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          website: form.website.trim(),
          category: form.category,
          description: form.description.trim(),
          best_for: form.best_for.trim(),
          pricing: form.pricing,
          difficulty: form.difficulty,
          free_plan: form.free_plan,
          api: form.api,
          mobile: form.mobile,
          opensource: form.opensource,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
          submitterName: form.submitterName.trim(),
          submitterEmail: form.submitterEmail.trim(),
          source: "manual_form",
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setStatus("error")
        setErrorMessage(data.error || "Something went wrong. Please try again.")
        return
      }
      setStatus("success")
    } catch {
      setStatus("error")
      setErrorMessage("Network error — please check your connection and try again.")
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/10 px-4">
        <div className="max-w-md w-full text-center bg-background border border-border/40 rounded-3xl p-10 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Thanks for the submission!</h1>
          <p className="text-muted-foreground mb-8">
            <strong>{form.name}</strong> has been sent for review. We'll verify and publish it to the
            directory soon — approved tools typically go live within a few days.
          </p>
          <Button
            onClick={() => {
              setForm(initialState)
              setStatus("idle")
            }}
            variant="outline"
            className="rounded-xl"
          >
            Submit Another Tool
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <div className="bg-background border-b border-border/40 pt-12 pb-10 px-4 text-center">
        <div className="container max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <Sparkles className="h-3 w-3" />
            <span>Submit a Tool</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Add Your AI Tool to FindUrAI</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Know a great AI tool that's missing from our directory? Submit it below — our team reviews
            every submission before it goes live.
          </p>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 mt-10">
        <form onSubmit={handleSubmit} className="bg-background border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          {status === "error" && errorMessage && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">
              {errorMessage}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tool Name *</label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Notion AI"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Website URL *</label>
              <Input
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category *</label>
            <Select value={form.category} onValueChange={(v) => v && update("category", v)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What does this tool do? What makes it worth listing? (minimum 20 characters)"
              rows={4}
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground">{form.description.length}/2000</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Best For</label>
            <Input
              value={form.best_for}
              onChange={(e) => update("best_for", e.target.value)}
              placeholder="e.g. Generating marketing copy for small businesses"
              maxLength={200}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pricing</label>
              <Select value={form.pricing} onValueChange={(v) => v && update("pricing", v)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={form.difficulty} onValueChange={(v) => v && update("difficulty", v)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.free_plan} onCheckedChange={(c) => update("free_plan", !!c)} />
              Free Plan
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.api} onCheckedChange={(c) => update("api", !!c)} />
              Has API
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.mobile} onCheckedChange={(c) => update("mobile", !!c)} />
              Mobile App
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.opensource} onCheckedChange={(c) => update("opensource", !!c)} />
              Open Source
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
              <Input
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                placeholder="writing, productivity, chatbot"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Key Features <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
              <Input
                value={form.features}
                onChange={(e) => update("features", e.target.value)}
                placeholder="Text generation, Templates, Team collaboration"
              />
            </div>
          </div>

          <div className="h-px bg-border/60" />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your Name <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                value={form.submitterName}
                onChange={(e) => update("submitterName", e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your Email <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                type="email"
                value={form.submitterEmail}
                onChange={(e) => update("submitterEmail", e.target.value)}
                placeholder="jane@example.com"
              />
              <p className="text-xs text-muted-foreground">We'll only use this to follow up if we have questions.</p>
            </div>
          </div>

          <Button type="submit" disabled={status === "submitting"} className="w-full h-12 rounded-xl font-semibold">
            {status === "submitting" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Tool
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
