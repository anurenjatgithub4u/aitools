import { competitorsRepo } from "@/lib/db";
import { HttpError, parseId, route } from "@/lib/http";

export const runtime = "nodejs";

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string; competitorId: string }> }) => {
  const { id, competitorId } = await ctx.params;
  if (!(await competitorsRepo.removeCompetitor(parseId(id), parseId(competitorId)))) {
    throw new HttpError(404, "not_found", "Competitor not found");
  }
  return new Response(null, { status: 204 });
});
