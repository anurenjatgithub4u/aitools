import "server-only";
import { z } from "zod";

// Read lazily (not at import time) so `next build` and pages that don't need a key work without one.
const ServerEnv = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  /** Max iTunes requests per minute across the whole server. */
  ITUNES_RPM: z.coerce.number().int().min(1).max(60).default(15),
  /** How long an iTunes search result is reused before refetching. */
  ITUNES_CACHE_TTL_MINUTES: z.coerce.number().int().min(0).default(60),
});

export type ServerEnv = z.infer<typeof ServerEnv>;

export function serverEnv(): ServerEnv {
  return ServerEnv.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL || undefined,
    ITUNES_RPM: process.env.ITUNES_RPM || undefined,
    ITUNES_CACHE_TTL_MINUTES: process.env.ITUNES_CACHE_TTL_MINUTES || undefined,
  });
}
