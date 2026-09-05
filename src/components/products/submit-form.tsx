"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, LogIn, Send } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  PRODUCT_CATEGORIES,
  MAX_NAME_CHARS,
  MAX_TAGLINE_CHARS,
  MIN_DESCRIPTION_CHARS,
  MAX_DESCRIPTION_CHARS,
} from "@/lib/products/config"

export function SubmitForm() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [tagline, setTagline] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || submitting) return

    setError("")
    setSubmitting(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          website,
          tagline,
          description,
          category,
          submitterName: user.displayName || "",
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        // A duplicate comes back with the existing slug — point them at it
        // rather than leaving them wondering where their product went.
        if (res.status === 409 && data?.slug) {
          router.push(`/product/${data.slug}`)
          return
        }
        setError(data?.error || "Something went wrong. Please try again.")
        return
      }

      router.push(`/product/${data.slug}`)
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Submissions publish instantly, so an account is what keeps this from being
  // an open spam relay. Explain that rather than just blocking the form.
  if (!user) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-8 text-center backdrop-blur">
        <LogIn className="mx-auto mb-4 h-7 w-7 text-muted-foreground/60" />
        <h2 className="text-lg font-semibold text-foreground">Sign in to submit</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Products go live the moment you submit them, so we ask for an account — it keeps the
          leaderboard free of spam and lets you manage what you&apos;ve posted.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login">
            <Button className="rounded-xl cursor-pointer">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" className="rounded-xl cursor-pointer">
              Create account
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Product name" hint={`${name.length}/${MAX_NAME_CHARS}`}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_CHARS}
          placeholder="Acme Analytics"
          required
        />
      </Field>

      <Field label="Website">
        <Input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="acme.com"
          required
        />
      </Field>

      <Field label="Tagline" hint={`${tagline.length}/${MAX_TAGLINE_CHARS}`}>
        <Input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={MAX_TAGLINE_CHARS}
          placeholder="One line on what it does — this is what people see on the leaderboard."
          required
        />
      </Field>

      <Field label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="" disabled>
            Choose a category
          </option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Description"
        hint={`${description.length}/${MAX_DESCRIPTION_CHARS} · min ${MIN_DESCRIPTION_CHARS}`}
      >
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={MAX_DESCRIPTION_CHARS}
          rows={5}
          placeholder="What it does, who it's for, and what makes it different."
          required
        />
      </Field>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={submitting || description.length < MIN_DESCRIPTION_CHARS}
        className="h-12 w-full gap-2 rounded-xl text-base font-semibold cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Publishing…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Publish to the leaderboard
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Goes live immediately. Free, and always will be.
      </p>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
