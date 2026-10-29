import { keywordsRepo } from "@/lib/db";
import { HttpError, parseId, route } from "@/lib/http";
import { requireProject } from "@/lib/session";

export const runtime = "nodejs";

/** Removes a keyword with its localized phrases and check history. */
export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string; keywordId: string }> }) => {
  const { id, keywordId } = await ctx.params;
  const { project } = await requireProject(parseId(id));
  if (!(await keywordsRepo.deleteKeyword(project.id, parseId(keywordId)))) throw new HttpError(404, "not_found", "Keyword not found");
  return new Response(null, { status: 204 });
});
