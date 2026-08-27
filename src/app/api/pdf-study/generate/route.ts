import { NextRequest, NextResponse } from "next/server";
import { hasAIProviderKey } from "@/lib/ai";
import {
  MAX_EXTRACTED_CHARS,
  MAX_FLASHCARDS,
  MAX_PDF_PAGES,
  MAX_QUESTIONS,
  MAX_QUIZ_QUESTIONS,
  MIN_EXTRACTABLE_CHARS,
  STUDY_PACK_COST_UNITS,
} from "@/lib/pdf-study/config";
import { generateStudyMaterial, GenerationError } from "@/lib/pdf-study/generate";
import { EmptyGenerationError } from "@/lib/pdf-study/sanitize";
import {
  clientIdentifier,
  consumeGeneration,
  limitForTier,
  refundGeneration,
  type UsageTier,
} from "@/lib/pdf-study/rate-limit";
import { verifyFirebaseIdToken } from "@/lib/pdf-study/verify-auth";
import {
  DETAIL_LEVELS,
  DIFFICULTIES,
  STUDY_MODES,
  type DetailLevel,
  type Difficulty,
  type GenerateResponse,
  type PdfPage,
  type StudyMode,
} from "@/lib/pdf-study/types";

// All AI credentials live in the environment and are read only inside
// src/lib/ai.ts, on the server. Nothing this route returns exposes a key.
//
// The response is a stream of newline-delimited JSON events so the progress UI
// can reflect what the server is genuinely doing:
//   {"type":"stage","stage":"flashcards"}
//   {"type":"result","results":{...},"usage":{...}}
//   {"type":"error","error":"..."}
// Errors before the stream opens are returned as an ordinary JSON response
// with the right status code instead.

export const runtime = "nodejs";
export const maxDuration = 300;

function maxQuantityFor(mode: StudyMode): number {
  if (mode === "flashcards") return MAX_FLASHCARDS;
  if (mode === "questions") return MAX_QUESTIONS;
  if (mode === "quiz") return MAX_QUIZ_QUESTIONS;
  return MAX_QUESTIONS;
}

function sanitizePages(raw: unknown): PdfPage[] {
  if (!Array.isArray(raw)) return [];
  let budget = MAX_EXTRACTED_CHARS;
  const pages: PdfPage[] = [];

  for (const entry of raw.slice(0, MAX_PDF_PAGES)) {
    const o = (entry ?? {}) as Record<string, unknown>;
    const page = typeof o.page === "number" ? o.page : Number(o.page);
    const text = typeof o.text === "string" ? o.text : "";
    if (!Number.isInteger(page) || page < 1 || page > MAX_PDF_PAGES) continue;
    if (budget <= 0) break;
    const clipped = text.slice(0, budget);
    budget -= clipped.length;
    pages.push({ page, text: clipped });
  }
  return pages;
}

export async function POST(req: NextRequest) {
  // ---- everything that can fail before work starts, as plain JSON ----
  if (!hasAIProviderKey()) {
    return NextResponse.json(
      { error: "AI is not configured for this site yet. Please try again later." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const mode: StudyMode = STUDY_MODES.includes(body.mode as StudyMode)
    ? (body.mode as StudyMode)
    : "notes";
  const detail: DetailLevel = DETAIL_LEVELS.includes(body.detail as DetailLevel)
    ? (body.detail as DetailLevel)
    : "standard";
  const difficulty: Difficulty = DIFFICULTIES.includes(body.difficulty as Difficulty)
    ? (body.difficulty as Difficulty)
    : "medium";

  const requestedQuantity = Number(body.quantity);
  const quantity = Number.isFinite(requestedQuantity)
    ? Math.max(1, Math.min(Math.round(requestedQuantity), maxQuantityFor(mode)))
    : 20;

  const requestId = typeof body.requestId === "string" ? body.requestId.trim().slice(0, 64) : "";
  if (!requestId) {
    return NextResponse.json({ error: "Missing request id." }, { status: 400 });
  }

  const pages = sanitizePages(body.pages);
  const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
  if (totalChars < MIN_EXTRACTABLE_CHARS) {
    return NextResponse.json(
      { error: "We couldn't find readable text in this PDF." },
      { status: 400 }
    );
  }

  const meta = (body.meta ?? {}) as Record<string, unknown>;
  const fileName = typeof meta.fileName === "string" ? meta.fileName.slice(0, 200) : "document.pdf";
  const reportedPageCount = Number(meta.pageCount);
  const pageCount =
    Number.isInteger(reportedPageCount) && reportedPageCount > 0
      ? Math.min(reportedPageCount, MAX_PDF_PAGES)
      : pages.length;
  // Page references are only permitted when extraction reported the mapping as
  // trustworthy — otherwise every sourcePages array is forced empty downstream.
  const pageMappingReliable = meta.pageMappingReliable === true && pages.length > 0;

  // ---- usage limits, reserved before any AI call so in-flight work counts ----
  const uid = await verifyFirebaseIdToken(typeof body.idToken === "string" ? body.idToken : undefined);
  const identity: { tier: UsageTier; id: string } = uid
    ? { tier: "authenticated", id: uid }
    : { tier: "anonymous", id: clientIdentifier(req.headers) };

  const cost = mode === "study-pack" ? STUDY_PACK_COST_UNITS : 1;
  const usage = await consumeGeneration(identity, requestId, cost);

  if (!usage.allowed) {
    if (usage.duplicate) {
      return NextResponse.json(
        { error: "This generation is already running. Please wait for it to finish." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: `You've reached your limit of ${usage.limit} generations per day. Please try again tomorrow.`,
        usage: { used: usage.used, limit: usage.limit, tier: identity.tier },
      },
      { status: 429 }
    );
  }

  // ---- stream progress + result ----
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const { results, failed } = await generateStudyMaterial(mode, {
          pages,
          pageCount,
          fileName,
          pageMappingReliable,
          detail,
          difficulty,
          quantity,
          onStage: (stage) => {
            if (stage !== "done") send({ type: "stage", stage });
          },
        });

        const payload: GenerateResponse & { type: "result"; partial?: string[] } = {
          type: "result",
          results,
          usage: { used: usage.used, limit: usage.limit, tier: identity.tier },
          ...(failed.length > 0 ? { partial: failed } : {}),
        };
        send(payload);
      } catch (e) {
        // Nothing usable was produced, so the reservation goes back rather than
        // charging the user for a failure.
        await refundGeneration(identity, cost).catch(() => {});

        if (e instanceof EmptyGenerationError) {
          send({
            type: "error",
            error:
              "We couldn't build study material from this PDF. It may not contain enough readable content.",
          });
        } else if (e instanceof GenerationError) {
          send({ type: "error", error: e.message });
        } else {
          // Provider errors can carry request details — logged, never returned.
          console.error("[pdf-study] generate failed:", e);
          send({ type: "error", error: "We couldn't generate your study materials. Please try again." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Stops intermediary proxies from buffering the stage events into one
      // response at the end, which would defeat the progress UI.
      "X-Accel-Buffering": "no",
    },
  });
}

// Lets the page show the remaining allowance without starting a generation.
export async function GET(req: NextRequest) {
  const uid = await verifyFirebaseIdToken(
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  );
  const tier: UsageTier = uid ? "authenticated" : "anonymous";
  return NextResponse.json({ limit: limitForTier(tier), tier });
}
