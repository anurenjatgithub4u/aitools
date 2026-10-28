import { appsRepo, keywordsRepo } from "@/lib/db";
import { HttpError, parseBody, route } from "@/lib/http";
import { brainstormKeywords } from "@/lib/openai/brainstorm";
import { BrainstormInput } from "@/lib/schemas/api";

export const runtime = "nodejs";

/** Generates ~30 keyword ideas with OpenAI and saves the new ones to the project. */
export const POST = route(async (req: Request) => {
  const input = await parseBody(req, BrainstormInput);

  let project = input.appId ? await appsRepo.getProject(input.appId) : null;
  if (input.appId && !project) throw new HttpError(404, "not_found", "Project not found");

  const ideas = await brainstormKeywords(input);

  project ??= await appsRepo.createProject({ name: input.name, niche: input.description, audience: input.audience });
  const added = await keywordsRepo.addKeywords(project.id, ideas);

  return Response.json({ project, ideas, added, keywords: await keywordsRepo.listKeywords(project.id) });
});
