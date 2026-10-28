import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { serverEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const { OPENAI_API_KEY } = serverEnv();
  if (!OPENAI_API_KEY) throw new HttpError(503, "missing_openai_key", "Set OPENAI_API_KEY in .env.local");
  client ??= new OpenAI({ apiKey: OPENAI_API_KEY });
  return client;
}

/**
 * Asks the model for JSON matching `schema` (structured outputs), then validates it with zod anyway.
 * If the JSON is missing or invalid, retries once and tells the model what was wrong.
 */
export async function generateStructured<T extends z.ZodType>(opts: {
  schema: T;
  name: string;
  instructions: string;
  input: string;
}): Promise<z.infer<T>> {
  const openai = getClient();
  const { OPENAI_MODEL } = serverEnv();
  let input = opts.input;
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      const res = await openai.responses.create({
        model: OPENAI_MODEL,
        instructions: opts.instructions,
        input,
        text: { format: zodTextFormat(opts.schema, opts.name) },
      });
      text = res.output_text;
    } catch (e) {
      if (e instanceof OpenAI.APIError) {
        const status = e.status === 401 ? 503 : 502;
        throw new HttpError(status, e.status === 401 ? "openai_auth" : "openai_error", `OpenAI request failed (${e.status ?? "network"})`);
      }
      throw e;
    }

    const checked = safeJson(text, opts.schema);
    if (checked.ok) return checked.data;
    lastError = checked.error;
    input = `${opts.input}\n\nYour previous answer was rejected: ${lastError}. Return only JSON that matches the schema.`;
  }
  throw new HttpError(502, "invalid_llm_output", `The model returned invalid JSON twice: ${lastError}`);
}

/** Parses and validates model output. Exported for tests. */
export function safeJson<T extends z.ZodType>(text: string, schema: T): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not valid JSON" };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue.path.join(".") || "root"}: ${issue.message}` };
  }
  return { ok: true, data: parsed.data };
}
