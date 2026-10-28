import { appsRepo, competitorsRepo } from "@/lib/db";
import { HttpError, parseBody, parseId, route } from "@/lib/http";
import { resolveApp } from "@/lib/resolve-app";
import { AddCompetitorInput } from "@/lib/schemas/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const appId = parseId((await ctx.params).id);
  return Response.json({ competitors: await competitorsRepo.listCompetitors(appId) });
});

/** Adds a competitor by name, App Store link or id. Ranks come from existing and future checks. */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const appId = parseId((await ctx.params).id);
  const { query } = await parseBody(req, AddCompetitorInput);
  const project = await appsRepo.getProject(appId);
  if (!project) throw new HttpError(404, "not_found", "Project not found");

  const { app, alternatives } = await resolveApp(query, project.countries[0]);
  if (app.trackId === project.itunesId) throw new HttpError(400, "is_my_app", "That's this project's own app");
  const competitor = await competitorsRepo.addCompetitor({ appId, itunesId: app.trackId, name: app.name, icon: app.icon || null });
  return Response.json({ competitor, alternatives }, { status: 201 });
});
