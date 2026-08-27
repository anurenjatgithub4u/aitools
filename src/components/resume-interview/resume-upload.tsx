"use client"

import { useRef, useState } from "react"
import { AlertCircle, FileText, Loader2, UploadCloud } from "lucide-react"

interface ResumeUploadProps {
  onFileSelected: (file: File) => void
  busy: boolean
  busyLabel: string
  error: string | null
}

const ACCEPTED = ".pdf,.docx,.txt"

export function ResumeUpload({ onFileSelected, busy, busyLabel, error }: ResumeUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    onFileSelected(file)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          busy ? "cursor-wait border-border/60 bg-card/40" : "cursor-pointer"
        } ${isDragOver ? "border-primary bg-primary/5" : "border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/60"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
          className="hidden"
          disabled={busy}
        />
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : fileName ? <FileText className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
        </div>
        {busy ? (
          <p className="font-semibold text-foreground">{busyLabel}</p>
        ) : fileName ? (
          <p className="font-semibold text-foreground">{fileName}</p>
        ) : (
          <p className="font-semibold text-foreground">Drag and drop your resume here, or click to browse</p>
        )}
        <p className="text-sm text-muted-foreground">PDF, DOCX, or TXT — up to 8MB</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
