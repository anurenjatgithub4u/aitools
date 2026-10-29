import { runCheck } from "@/lib/check";
import { parseBody, route } from "@/lib/http";
import { CheckInput } from "@/lib/schemas/api";
import { requireProject } from "@/lib/session";

export const runtime = "nodejs";
// one iTunes search plus a couple of DB writes; well under any serverless limit
export const maxDuration = 60;

/**
 * Checks ONE keyword in ONE country against the iTunes Search API, stores it with a timestamp and
 * returns my rank (null = 200+) and the top 5 apps. 429 { details.retryAfterMs } when Apple rate
 * limits. The board calls this once per row, spaced ~4s apart (see CHECK_SPACING_MS).
 */
export const POST = route(async (req: Request) => {
  const input = await parseBody(req, CheckInput);
  const { project } = await requireProject(input.appId);
  return Response.json({ result: await runCheck(project, input.keywordId, input.country, input.force ?? false) });
});
