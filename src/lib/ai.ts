// Central AI provider abstraction. Every text/JSON generation call in the
// workspace feature routes through callAI() so the whole app can switch
// between Gemini and OpenAI with one env var — no per-call-site changes.
//
// AI_PROVIDER=openai|gemini in .env.local picks explicitly. If unset, it
// defaults to whichever provider has a key configured (OpenAI first).

export type AIProvider = "gemini" | "openai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Model tiers let a caller spend cheaply on mechanical steps (classification,
// quality checks, simple extraction) and reserve the stronger model for work
// where quality actually shows — final notes, study guides, prompt authoring.
// Omitting the tier keeps the previous single-model behaviour exactly, so
// existing call sites are unaffected.
export type AIModelTier = "fast" | "strong";

const GEMINI_MODEL_FAST = process.env.GEMINI_MODEL_FAST || GEMINI_MODEL;
const GEMINI_MODEL_STRONG = process.env.GEMINI_MODEL_STRONG || GEMINI_MODEL;
const OPENAI_MODEL_FAST = process.env.OPENAI_MODEL_FAST || OPENAI_MODEL;
const OPENAI_MODEL_STRONG = process.env.OPENAI_MODEL_STRONG || OPENAI_MODEL;

function modelFor(provider: AIProvider, tier?: AIModelTier): string {
  if (provider === "openai") {
    if (tier === "fast") return OPENAI_MODEL_FAST;
    if (tier === "strong") return OPENAI_MODEL_STRONG;
    return OPENAI_MODEL;
  }
  if (tier === "fast") return GEMINI_MODEL_FAST;
  if (tier === "strong") return GEMINI_MODEL_STRONG;
  return GEMINI_MODEL;
}

/** The model id a given tier resolves to — recorded in usage metrics. */
export function resolvedModelName(tier?: AIModelTier): string {
  return modelFor(resolveProvider(), tier);
}

function resolveProvider(): AIProvider {
  const explicit = (process.env.AI_PROVIDER || "").toLowerCase();
  if (explicit === "openai" || explicit === "gemini") return explicit;
  if (process.env.OPENAI_API_KEY) return "openai";
  return "gemini";
}

export function currentAIProvider(): AIProvider {
  return resolveProvider();
}

// True once whichever provider is currently selected has a key configured —
// use this instead of checking process.env.GEMINI_API_KEY directly.
export function hasAIProviderKey(): boolean {
  const provider = resolveProvider();
  return provider === "openai" ? !!process.env.OPENAI_API_KEY : !!process.env.GEMINI_API_KEY;
}

async function callGemini(prompt: string, json: boolean, retries: number, model: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const retryable = res.status === 503 || res.status === 429;

    if (text && data.usageMetadata) {
      console.log(`[ai:gemini] token usage (attempt ${attempt}):`, {
        promptTokens: data.usageMetadata.promptTokenCount,
        outputTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      });
    }
    if (!res.ok || !text) {
      console.error(
        `[ai:gemini] error (attempt ${attempt}/${retries}):`,
        JSON.stringify({ httpStatus: res.status, error: data.error, finishReason: data.candidates?.[0]?.finishReason }, null, 2)
      );
      if (retryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 4000));
        continue;
      }
      throw new Error(data.error?.message || data.candidates?.[0]?.finishReason || "Gemini request failed");
    }
    return text;
  }
  throw new Error("Gemini request failed after retries");
}

async function callOpenAI(prompt: string, json: boolean, retries: number, model: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    const retryable = res.status === 503 || res.status === 429;

    if (text && data.usage) {
      console.log(`[ai:openai] token usage (attempt ${attempt}):`, {
        promptTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      });
    }
    if (!res.ok || !text) {
      console.error(
        `[ai:openai] error (attempt ${attempt}/${retries}):`,
        JSON.stringify({ httpStatus: res.status, error: data.error }, null, 2)
      );
      if (retryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 4000));
        continue;
      }
      throw new Error(data.error?.message || "OpenAI request failed");
    }
    return text;
  }
  throw new Error("OpenAI request failed after retries");
}

// Returns raw text — JSON.parse it yourself when opts.json (default true).
export async function callAI(
  prompt: string,
  opts: { json?: boolean; retries?: number; tier?: AIModelTier } = {}
): Promise<string> {
  const { json = true, retries = 3, tier } = opts;
  const provider = resolveProvider();
  const model = modelFor(provider, tier);
  return provider === "openai"
    ? callOpenAI(prompt, json, retries, model)
    : callGemini(prompt, json, retries, model);
}
