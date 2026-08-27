"use client"

import { useCallback, useRef, useState } from "react"

// MediaRecorder fallback for browsers without Web Speech API support —
// Firefox, and Safari depending on version.
//
// Records the reading, then posts the audio to /api/reading/transcribe where
// it's transcribed server-side. Slower than live recognition and with no live
// highlighting, but it means the utility works everywhere rather than showing
// an apology to a third of visitors.

export type RecorderErrorKind = "not-supported" | "permission-denied" | "no-microphone" | "unknown"

const ERROR_COPY: Record<RecorderErrorKind, string> = {
  "not-supported": "Your browser can't record audio. Try Chrome or Edge.",
  "permission-denied": "Microphone access was blocked. Allow it in your browser settings, then try again.",
  "no-microphone": "We couldn't find a microphone. Check it's connected and try again.",
  unknown: "Recording stopped unexpectedly. Please try again.",
}

/** Ordered by transcription-service compatibility, not by quality. */
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
]

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null
  for (const type of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

export interface AudioRecorderState {
  supported: boolean
  recording: boolean
  error: { kind: RecorderErrorKind; message: string } | null
  start: () => Promise<boolean>
  /** Resolves with the recording, or null if nothing was captured. */
  stop: () => Promise<Blob | null>
  reset: () => void
}

export function useAudioRecorder(): AudioRecorderState {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<AudioRecorderState["error"]>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const supported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined"

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    setError(null)

    const mimeType = pickMimeType()
    if (!mimeType) {
      setError({ kind: "not-supported", message: ERROR_COPY["not-supported"] })
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setError({ kind: "unknown", message: ERROR_COPY.unknown })
        setRecording(false)
        releaseStream()
      }

      recorderRef.current = recorder
      // Timeslice so data arrives during recording rather than only at stop —
      // a crash mid-session then still leaves something usable.
      recorder.start(1000)
      setRecording(true)
      return true
    } catch (e) {
      const name = (e as { name?: string })?.name
      const kind: RecorderErrorKind = name === "NotFoundError" ? "no-microphone" : "permission-denied"
      setError({ kind, message: ERROR_COPY[kind] })
      releaseStream()
      return false
    }
  }, [releaseStream])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === "inactive") {
        setRecording(false)
        releaseStream()
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const chunks = chunksRef.current
        setRecording(false)
        releaseStream()
        resolve(chunks.length > 0 ? new Blob(chunks, { type: recorder.mimeType }) : null)
      }

      try {
        recorder.stop()
      } catch {
        setRecording(false)
        releaseStream()
        resolve(null)
      }
    })
  }, [releaseStream])

  const reset = useCallback(() => {
    try {
      recorderRef.current?.stop()
    } catch {
      /* already stopped */
    }
    recorderRef.current = null
    chunksRef.current = []
    releaseStream()
    setRecording(false)
    setError(null)
  }, [releaseStream])

  return { supported, recording, error, start, stop, reset }
}
