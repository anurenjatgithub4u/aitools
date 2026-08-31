"use client"

import { useState } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { PdfUpload } from "@/components/pdf-tools/pdf-upload"
import { PdfFileCard } from "@/components/pdf-tools/pdf-file-card"
import { PdfProgress } from "@/components/pdf-tools/pdf-progress"
import { PdfResult } from "@/components/pdf-tools/pdf-result"
import { PdfError } from "@/components/pdf-tools/pdf-error"
import { usePdfProcessing } from "@/lib/pdf-tools/use-pdf-processing"
import { downloadBlob } from "@/lib/pdf-tools/client"
import { trackPdfEvent } from "@/lib/pdf-tools/analytics"
import { getPdfPageCount } from "@/lib/pdf-tools/thumbnails"

interface ProtectResult {
  blob: Blob
  downloadName: string
  pageCount: number
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  helpText,
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  helpText?: string
  required?: boolean
}) {
  const [show, setShow] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground mb-1.5">
        {label}
        {required && <span className="text-primary ml-1" aria-label="required">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {helpText && <p className="text-xs text-muted-foreground mt-1.5">{helpText}</p>}
    </div>
  )
}

export function ProtectTool() {
  const { user } = useAuth()
  const { state, setReady, uploadFraction, error, setError, run, reset, isBusy } = usePdfProcessing()

  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [result, setResult] = useState<ProtectResult | null>(null)

  const [userPassword, setUserPassword] = useState("")
  const [ownerPassword, setOwnerPassword] = useState("")
  const [useOwnerPassword, setUseOwnerPassword] = useState(false)

  const handleFilesSelected = async (files: File[]) => {
    const selected = files[0]
    setFile(selected)
    setResult(null)
    setError(null)
    setReady()
    trackPdfEvent("pdf_tool_opened", { tool_name: "pdf_protect", file_size: selected.size })
    try {
      const count = await getPdfPageCount(selected)
      setPageCount(count)
    } catch {
      // Display nicety only
    }
  }

  const handleProtect = async () => {
    if (!file || isBusy) return

    if (!userPassword.trim()) {
      setError("Please enter a password to protect the PDF.")
      return
    }

    trackPdfEvent("pdf_processing_started", {
      tool_name: "pdf_protect",
      file_size: file.size,
      page_count: pageCount ?? undefined,
    })

    const formData = new FormData()
    formData.append("file", file)
    formData.append(
      "options",
      JSON.stringify({
        userPassword,
        ownerPassword: useOwnerPassword && ownerPassword.trim() ? ownerPassword : undefined,
      })
    )
    const idToken = user ? await user.getIdToken().catch(() => undefined) : undefined
    if (idToken) formData.append("idToken", idToken)

    const started = Date.now()
    const res = await run("/api/pdf/protect", formData)
    if (!res) {
      trackPdfEvent("pdf_processing_failed", { tool_name: "pdf_protect", file_size: file.size })
      return
    }

    const meta = {
      pageCount: Number(res.meta["page-count"] ?? pageCount ?? 0),
    }
    setResult({ blob: res.blob, downloadName: res.downloadName, ...meta })
    trackPdfEvent("pdf_processing_completed", {
      tool_name: "pdf_protect",
      file_size: file.size,
      page_count: meta.pageCount,
      processing_time: Date.now() - started,
    })
  }

  const handleDownload = () => {
    if (!result) return
    downloadBlob(result.blob, result.downloadName)
    trackPdfEvent("pdf_downloaded", { tool_name: "pdf_protect" })
  }

  const handleReset = () => {
    setFile(null)
    setPageCount(null)
    setResult(null)
    setUserPassword("")
    setOwnerPassword("")
    reset()
  }

  // ---- result ----
  if (state === "success" && result) {
    return (
      <PdfResult
        heading="Your PDF is now protected."
        primaryAction={{ label: "Download Protected PDF", onClick: handleDownload }}
        secondaryActions={[{ label: "Protect Another PDF", onClick: handleReset }]}
      >
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span>
            {result.pageCount} {result.pageCount === 1 ? "page" : "pages"} · Password encrypted
          </span>
        </div>
      </PdfResult>
    )
  }

  return (
    <>
      {!file && <PdfUpload onFilesSelected={handleFilesSelected} />}

      {file && (
        <PdfFileCard
          fileName={file.name}
          byteSize={file.size}
          pageCount={pageCount}
          onRemove={handleReset}
          onReplace={handleReset}
        />
      )}

      {file && (state === "ready" || state === "error") && (
        <div className="space-y-5">
          <PasswordInput
            id="user-password"
            label="Open password"
            value={userPassword}
            onChange={setUserPassword}
            placeholder="Enter a password…"
            helpText="Anyone who opens the PDF will need this password."
            required
          />

          <div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useOwnerPassword}
                onChange={(e) => setUseOwnerPassword(e.target.checked)}
                className="accent-[var(--primary)] rounded"
              />
              Set a separate owner password (for permissions)
            </label>
          </div>

          {useOwnerPassword && (
            <PasswordInput
              id="owner-password"
              label="Owner password"
              value={ownerPassword}
              onChange={setOwnerPassword}
              placeholder="Enter owner password…"
              helpText="The owner password allows full editing and printing without restrictions."
            />
          )}

          <div className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">What gets restricted?</p>
            <p>Without the owner password, recipients can only view and fill forms — printing is low-resolution only, and copying text is disabled.</p>
          </div>

          {error && <PdfError message={error} />}

          <button
            type="button"
            onClick={handleProtect}
            disabled={isBusy || !userPassword.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Protect PDF
          </button>
        </div>
      )}

      {(state === "uploading" || state === "processing") && (
        <PdfProgress
          phase={state}
          uploadFraction={uploadFraction}
          label={state === "processing" ? "Encrypting your PDF…" : undefined}
        />
      )}
    </>
  )
}
