"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState("")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!email) {
      setError("Please enter your email address.")
      return
    }

    try {
      setLoading(true)
      await resetPassword(email)
      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      if (err.code === "auth/user-not-found") {
        setError("No user found with this email address.")
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.")
      } else {
        setError(err.message || "Failed to send reset email. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center p-6 bg-background relative overflow-hidden">
      {/* Extremely subtle ambient glow in background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-foreground/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[420px] z-10 flex flex-col"
      >
        {/* Minimalist Logo Spark Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center shadow-md shadow-foreground/5 dark:shadow-none border border-border/10">
            <svg className="w-6 h-6 text-background" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-xl shadow-foreground/[0.01]">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Reset password
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              We'll send you a link to reset your password
            </p>
          </div>

          {success ? (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Reset Email Sent</p>
                  <p className="text-sm text-muted-foreground">
                    Check your inbox at <span className="font-medium text-foreground">{email}</span> for instructions.
                  </p>
                </div>
              </div>
              <Link href="/login" className="block w-full">
                <Button variant="outline" className="w-full h-12 rounded-xl font-medium gap-2 cursor-pointer transition-all">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/10 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 px-4 bg-background border border-border/80 rounded-xl focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-foreground transition-all duration-150"
                  required
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-medium mt-3 cursor-pointer bg-foreground text-background hover:bg-foreground/90 active:scale-[0.99] transition-all duration-150 shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          )}

          {!success && (
            <div className="mt-8 pt-6 border-t border-border/40 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
