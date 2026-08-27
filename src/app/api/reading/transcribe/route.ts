// POST /api/reading/transcribe — server-side audio transcription.
//
// The fallback path for browsers without Web Speech API support, and the
// authoritative transcript when recorded audio is available.
//
// The API key never leaves the server. The browser posts audio here; it never
// talks to the transcription provider directly, and OPENAI_API_KEY is not a
// NEXT_PUBLIC_ variable.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/** A few minutes of speech at a sane bitrate. Larger uploads are rejected
 *  before they're read into memory. */
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

function fail(message: string, status: number, hint?: string) {
  return NextResponse.json({ ok: false, error: message, hint }, { status });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[reading:transcribe] OPENAI_API_KEY is not configured");
    return fail("Transcription isn't available right now.", 503, "Please try the live microphone instead.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("We couldn't read that upload.", 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) return fail("No audio was uploaded.", 400);
  if (audio.size === 0) return fail("The recording was empty.", 400, "Check your microphone and try again.");
  if (audio.size > MAX_AUDIO_BYTES) {
    return fail("That recording is too long.", 413, "Try a shorter passage.");
  }

  // Passing the passage as a prompt biases the model toward the expected
  // vocabulary, which materially improves accuracy on proper nouns and
  // technical terms. It cannot make the model invent words the reader didn't
  // say — it only breaks ties.
  const passageHint = typeof form.get("passage") === "string" ? String(form.get("passage")).slice(0, 800) : "";
  const language = typeof form.get("language") === "string" ? String(form.get("language")) : "en";

  const upstream = new FormData();
  // The provider infers format from the filename extension, so it has to match
  // the recorded MIME type rather than being a fixed string.
  const extension = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
  upstream.append("file", audio, `reading.${extension}`);
  upstream.append("model", TRANSCRIBE_MODEL);
  upstream.append("language", language.split("-")[0]);
  upstream.append("response_format", "json");
  if (passageHint) upstream.append("prompt", passageHint);

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[reading:transcribe] HTTP ${res.status}: ${detail.slice(0, 300)}`);
      return fail(
        "We couldn't transcribe that recording.",
        502,
        "You can try again, or read again using the live microphone."
      );
    }

    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? "").trim();

    if (!text) {
      return fail("We didn't hear any speech in that recording.", 422, "Check your microphone and try again.");
    }

    return NextResponse.json({ ok: true, transcript: text });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "TimeoutError";
    console.error("[reading:transcribe] request failed:", e);
    return fail(
      aborted ? "Transcription took too long." : "We couldn't reach the transcription service.",
      504,
      "Please try again."
    );
  }
}
