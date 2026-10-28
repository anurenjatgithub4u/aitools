import "server-only";
import type { z } from "zod";

/** An error with an HTTP status and a stable machine-readable code for the UI. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
  }
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "invalid_input", "Invalid request", parsed.error.issues);
  return parsed.data;
}

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "invalid_id", "Invalid id");
  return id;
}

/** Wraps a route handler: HttpErrors become JSON responses, anything else a generic 500. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return Response.json({ error: e.code, message: e.message, details: e.details }, { status: e.status });
      }
      // Log the message only: SDK errors can echo request headers.
      console.error("[api]", e instanceof Error ? e.message : e);
      return Response.json({ error: "internal", message: "Something went wrong" }, { status: 500 });
    }
  };
}
