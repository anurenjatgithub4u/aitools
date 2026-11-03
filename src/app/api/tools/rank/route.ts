import { parseBody, route } from "@/lib/http";
import { PublicRankInput } from "@/lib/schemas/api";
import { publicRankCheck, visitorKey } from "@/lib/tools/rank-check";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The free rank checker: no account, limited per visitor (see PUBLIC_RANK_LIMIT). Finds the app,
 * searches the keyword in that country and returns its rank and the top 5. Nothing is stored
 * except the shared iTunes cache and a hashed-IP counter.
 */
export const POST = route(async (req: Request) => {
  const input = await parseBody(req, PublicRankInput);
  return Response.json({ result: await publicRankCheck(visitorKey(req), input.app, input.keyword, input.country) });
});
