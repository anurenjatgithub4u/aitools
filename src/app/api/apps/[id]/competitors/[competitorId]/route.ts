import { competitorsRepo } from "@/lib/db";
import { HttpError, parseId, route } from "@/lib/http";
import { requireProject } from "@/lib/session";

export const runtime = "nodejs";

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string; competitorId: string }> }) => {
  const { id, competitorId } = await ctx.params;
  const { project } = await requireProject(parseId(id));
  if (!(await competitorsRepo.removeCompetitor(project.id, parseId(competitorId)))) {
    throw new HttpError(404, "not_found", "Competitor not found");
  }
  return new Response(null, { status: 204 });
});
