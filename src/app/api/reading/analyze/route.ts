// POST /api/reading/analyze — AI coaching for a completed reading.
//
// The alignment, metrics and mistake list are computed on the server from the
// raw text the client sends, NOT taken from the client's own numbers. That
// keeps one implementation of the scoring rules and means a tampered request
// can't manufacture a perfect score.

import { NextRequest, NextResponse } from "next/server";
import { alignTranscriptToPassage, summarizeAlignment } from "@/lib/reading/alignment";
import { calculateMetrics } from "@/lib/reading/scoring";
import { summarizePauses, type PauseEvent } from "@/lib/reading/pauses";
import { generateCoaching, fallbackFeedback } from "@/lib/reading/coach";
import { tokenize } from "@/lib/reading/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT_CHARS = 12_000;

export async function POST(req: NextRequest) {
  let body: {
    passageTitle?: string;
    expectedText?: string;
    transcript?: string;
    elapsedMs?: number;
    pauses?: PauseEvent[];
    comprehension?: number | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const expectedText = (body.expectedText ?? "").slice(0, MAX_TEXT_CHARS);
  const transcript = (body.transcript ?? "").slice(0, MAX_TEXT_CHARS);

  if (!expectedText.trim()) {
    return NextResponse.json({ ok: false, error: "Nothing to analyse." }, { status: 400 });
  }

  // Recomputed here rather than trusted from the client (see file header).
  const aligned = alignTranscriptToPassage(expectedText, transcript);
  const summary = summarizeAlignment(aligned);
  const pauses = summarizePauses(Array.isArray(body.pauses) ? body.pauses.slice(0, 200) : []);
  const elapsedMs = Math.max(1000, Math.min(Number(body.elapsedMs) || 0, 60 * 60 * 1000));

  const metrics = calculateMetrics({
    summary,
    pauses,
    spokenWordCount: tokenize(transcript, { stripFillers: true }).length,
    elapsedMs,
    comprehension: typeof body.comprehension === "number" ? body.comprehension : null,
  });

  const mistakes = aligned.filter((w) => w.status === "incorrect" || w.status === "skipped");

  // A reading with no transcript has nothing to coach on — return the computed
  // feedback rather than spending a model call to say "you didn't speak".
  if (!transcript.trim()) {
    return NextResponse.json({
      ok: true,
      metrics,
      summary,
      feedback: fallbackFeedback(metrics, summary, pauses),
    });
  }

  try {
    const feedback = await generateCoaching({
      passageTitle: (body.passageTitle ?? "").slice(0, 200),
      expectedText,
      transcript,
      metrics,
      summary,
      pauses,
      mistakes,
    });

    return NextResponse.json({ ok: true, metrics, summary, feedback });
  } catch (e) {
    console.error("[reading:analyze] coaching failed:", e);
    // Never fail the request over coaching — the numbers are the substance.
    return NextResponse.json({
      ok: true,
      metrics,
      summary,
      feedback: fallbackFeedback(metrics, summary, pauses),
    });
  }
}
