import { keywordsRepo } from "@/lib/db";
import { parseBody, parseId, route } from "@/lib/http";
import { AddKeywordsInput } from "@/lib/schemas/api";
import { requireProject } from "@/lib/session";

export const runtime = "nodejs";

/** Adds keywords typed by hand. Duplicates of existing keywords are skipped. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { project } = await requireProject(parseId((await ctx.params).id));
  const appId = project.id;
  const { terms } = await parseBody(req, AddKeywordsInput);
  const added = await keywordsRepo.addKeywords(
    appId,
    terms.map((t) => ({ term: t.toLowerCase(), kind: t.trim().split(/\s+/).length <= 2 ? "short" : "long" })),
  );
  return Response.json({ added }, { status: 201 });
});
