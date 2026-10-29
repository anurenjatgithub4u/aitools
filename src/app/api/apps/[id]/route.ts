import { appsRepo } from "@/lib/db";
import { HttpError, parseBody, parseId, route } from "@/lib/http";
import { loadBoard } from "@/lib/load-board";
import { resolveApp } from "@/lib/resolve-app";
import { UpdateProjectInput } from "@/lib/schemas/api";
import { requireProject, requireUser } from "@/lib/session";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** The board: project, competitors and one scored row per keyword × country. */
export const GET = route(async (_req: Request, ctx: Ctx) => {
  const board = await loadBoard(parseId((await ctx.params).id), (await requireUser()).id);
  if (!board) throw new HttpError(404, "not_found", "Project not found");
  return Response.json(board);
});

/** Change target countries, or link/unlink "my app" (appStore: link, id, name, or null). */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const { user, project } = await requireProject(parseId((await ctx.params).id));
  const input = await parseBody(req, UpdateProjectInput);

  const patch: Parameters<typeof appsRepo.updateProject>[2] = {};
  if (input.countries) patch.countries = input.countries;
  if (input.appStore === null || input.appStore === "") {
    patch.itunesId = null;
    patch.icon = null;
  } else if (input.appStore) {
    const { app } = await resolveApp(input.appStore, (input.countries ?? project.countries)[0]);
    patch.itunesId = app.trackId;
    patch.icon = app.icon || null;
  }
  return Response.json({ project: await appsRepo.updateProject(project.id, user.id, patch) });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  if (!(await appsRepo.deleteProject(parseId((await ctx.params).id), (await requireUser()).id))) throw new HttpError(404, "not_found", "Project not found");
  return new Response(null, { status: 204 });
});
