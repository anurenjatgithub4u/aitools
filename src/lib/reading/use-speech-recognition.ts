"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

// Browser speech recognition, wrapped for Next.js client components.
//
// Written directly against the Web Speech API rather than pulling in a
// library: the surface we need is small, and the wrappers add a dependency
// plus their own lifecycle quirks on top of an API that is already awkward.
//
// The awkward parts this handles:
//  - vendor prefix (webkitSpeechRecognition everywhere except Firefox, which
//    has no support at all)
//  - the engine stopping itself after a silence, which must be restarted
//    transparently or a reader pausing to breathe ends their session
//  - "no-speech" and "aborted" errors that are normal, not failures
//  - results arriving as a growing list that must be read from resultIndex
//
// It is never the sole source of truth. The final transcript can be replaced
// by a server-side transcription of recorded audio (spec: hybrid architecture).

export type SpeechErrorKind =
  | "not-supported"
  | "permission-denied"
  | "no-microphone"
  | "no-speech"
  | "network"
  | "unknown"

export interface SpeechSegment {
  text: string
  at: number
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: { isFinal: boolean; 0: { transcript: string }; length: number }
  }
}

type RecognitionCtor = new () => SpeechRecognitionLike

/** Support can't change during a session, so there is nothing to subscribe to. */
function subscribeNever(): () => void {
  return () => {}
}

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface UseSpeechRecognitionOptions {
  lang?: string
  /** Called for each finalised segment — the signal the caller aligns on. */
  onFinalSegment?: (segment: SpeechSegment) => void
}

export interface SpeechRecognitionState {
  supported: boolean
  listening: boolean
  paused: boolean
  interimTranscript: string
  finalTranscript: string
  segments: SpeechSegment[]
  error: { kind: SpeechErrorKind; message: string } | null
  start: () => Promise<boolean>
  pause: () => void
  resume: () => Promise<boolean>
  stop: () => void
  reset: () => void
}

/** Messages the user actually sees. Every one names a fix. */
const ERROR_COPY: Record<SpeechErrorKind, string> = {
  "not-supported": "Your browser doesn't support live speech recognition. You can record instead.",
  "permission-denied": "Microphone access was blocked. Allow it in your browser settings, then try again.",
  "no-microphone": "We couldn't find a microphone. Check it's connected and try again.",
  "no-speech": "We didn't hear anything. Check your microphone and try again.",
  network: "Speech recognition lost its connection. Check your network and try again.",
  unknown: "Speech recognition stopped unexpectedly. You can try again or record instead.",
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): SpeechRecognitionState {
  const { lang = "en-US", onFinalSegment } = options

  // Feature detection via useSyncExternalStore rather than an effect: support
  // is an external value that differs between server and client, which is
  // exactly what this hook is for. It also gives a correct server snapshot, so
  // there's no hydration mismatch and no cascading render.
  const supported = useSyncExternalStore(
    subscribeNever,
    () => getRecognitionCtor() !== null,
    () => false
  )

  const [listening, setListening] = useState(false)
  const [paused, setPaused] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [finalTranscript, setFinalTranscript] = useState("")
  const [segments, setSegments] = useState<SpeechSegment[]>([])
  const [error, setError] = useState<SpeechRecognitionState["error"]>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Distinguishes "the engine stopped on its own" (restart it) from "the user
  // stopped it" (leave it stopped). Without this, stop() is fought by the
  // auto-restart and the session can't be ended.
  const wantListeningRef = useRef(false)

  // The latest callback, kept in a ref so the recognition instance doesn't
  // need rebuilding when the caller passes a new closure. Assigned in an
  // effect rather than during render — a ref write during render is invisible
  // to React and can be lost.
  const onFinalRef = useRef(onFinalSegment)
  useEffect(() => {
    onFinalRef.current = onFinalSegment
  }, [onFinalSegment])

  const buildRecognition = useCallback((): SpeechRecognitionLike | null => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return null

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ""
      let finalChunk = ""

      // Only read from resultIndex forward — earlier entries were already
      // handled, and re-reading them duplicates the transcript.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ""
        if (result.isFinal) finalChunk += `${text} `
        else interim += `${text} `
      }

      setInterimTranscript(interim.trim())

      if (finalChunk.trim()) {
        const segment = { text: finalChunk.trim(), at: Date.now() }
        setFinalTranscript((prev) => `${prev} ${segment.text}`.trim())
        setSegments((prev) => [...prev, segment])
        onFinalRef.current?.(segment)
      }
    }

    recognition.onerror = (event) => {
      const code = event.error ?? "unknown"
      // Both are routine: "no-speech" fires during a pause, "aborted" fires
      // when we stop it ourselves. Neither is worth showing the user.
      if (code === "no-speech" || code === "aborted") return

      const kind: SpeechErrorKind =
        code === "not-allowed" || code === "service-not-allowed"
          ? "permission-denied"
          : code === "audio-capture"
            ? "no-microphone"
            : code === "network"
              ? "network"
              : "unknown"

      setError({ kind, message: ERROR_COPY[kind] })
      if (kind === "permission-denied" || kind === "no-microphone") {
        wantListeningRef.current = false
        setListening(false)
      }
    }

    recognition.onend = () => {
      // Chrome ends the session after a stretch of silence. Restarting keeps a
      // reader who paused to breathe from silently losing their session.
      if (wantListeningRef.current) {
        try {
          recognition.start()
          return
        } catch {
          /* already starting — fall through and mark stopped */
        }
      }
      setListening(false)
    }

    return recognition
  }, [lang])

  const start = useCallback(async (): Promise<boolean> => {
    setError(null)

    if (!getRecognitionCtor()) {
      setError({ kind: "not-supported", message: ERROR_COPY["not-supported"] })
      return false
    }

    // Ask for the microphone explicitly first. Doing it here produces a clear
    // permission error instead of the recognition engine failing opaquely.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // The recognition engine opens its own stream; release this one.
      stream.getTracks().forEach((track) => track.stop())
    } catch (e) {
      const name = (e as { name?: string })?.name
      const kind: SpeechErrorKind = name === "NotFoundError" ? "no-microphone" : "permission-denied"
      setError({ kind, message: ERROR_COPY[kind] })
      return false
    }

    recognitionRef.current?.abort()
    const recognition = buildRecognition()
    if (!recognition) return false

    recognitionRef.current = recognition
    wantListeningRef.current = true

    try {
      recognition.start()
      setListening(true)
      setPaused(false)
      return true
    } catch {
      setError({ kind: "unknown", message: ERROR_COPY.unknown })
      return false
    }
  }, [buildRecognition])

  const pause = useCallback(() => {
    wantListeningRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
    setPaused(true)
    setInterimTranscript("")
  }, [])

  const resume = useCallback(async () => {
    setPaused(false)
    return start()
  }, [start])

  const stop = useCallback(() => {
    wantListeningRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
    setPaused(false)
    setInterimTranscript("")
  }, [])

  const reset = useCallback(() => {
    wantListeningRef.current = false
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setListening(false)
    setPaused(false)
    setInterimTranscript("")
    setFinalTranscript("")
    setSegments([])
    setError(null)
  }, [])

  // Leaving the page mid-session must not leave the microphone open.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  return {
    supported,
    listening,
    paused,
    interimTranscript,
    finalTranscript,
    segments,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
