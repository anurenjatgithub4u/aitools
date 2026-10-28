import { appsRepo, keywordsRepo } from "@/lib/db";
import { HttpError, parseBody, parseId, route } from "@/lib/http";
import { AddKeywordsInput } from "@/lib/schemas/api";

export const runtime = "nodejs";

/** Adds keywords typed by hand. Duplicates of existing keywords are skipped. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const appId = parseId((await ctx.params).id);
  const { terms } = await parseBody(req, AddKeywordsInput);
  if (!(await appsRepo.getProject(appId))) throw new HttpError(404, "not_found", "Project not found");
  const added = await keywordsRepo.addKeywords(
    appId,
    terms.map((t) => ({ term: t.toLowerCase(), kind: t.trim().split(/\s+/).length <= 2 ? "short" : "long" })),
  );
  return Response.json({ added }, { status: 201 });
});
