"use client"

import { useCallback, useState } from "react"
import { postPdfForFile, PdfClientError, type PdfToolFileResult } from "./client"
import type { ProcessingState } from "./types"

// Shared upload→process→result state machine used by all three tool
// components — idle/uploading/ready/processing/success/error (spec §4).
// Each tool still owns its own file/settings state; this only owns the
// network call and the state machine around it, so the three tools don't
// each re-implement duplicate-submission guarding and error copy.
export function usePdfProcessing() {
  const [state, setState] = useState<ProcessingState>("idle")
  const [uploadFraction, setUploadFraction] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (url: string, formData: FormData): Promise<PdfToolFileResult | null> => {
    setState("uploading")
    setUploadFraction(0)
    setError(null)
    try {
      const result = await postPdfForFile(url, formData, (fraction) => {
        setUploadFraction(fraction)
        // Once the upload itself completes, the server is doing the actual
        // work — switch to the indeterminate "processing" phase.
        if (fraction >= 1) setState("processing")
      })
      setState("success")
      return result
    } catch (e) {
      setError(e instanceof PdfClientError ? e.message : "We couldn't process this PDF. Please try again.")
      setState("error")
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState("idle")
    setUploadFraction(0)
    setError(null)
  }, [])

  const setReady = useCallback(() => setState("ready"), [])

  // A submission is already in flight — callers use this to disable the
  // primary action button and prevent duplicate jobs (spec §29).
  const isBusy = state === "uploading" || state === "processing"

  return { state, setState, setReady, uploadFraction, error, setError, run, reset, isBusy }
}
