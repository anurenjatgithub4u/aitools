import { buildTasks, startCheckJob } from "@/lib/check";
import { appsRepo, keywordsRepo } from "@/lib/db";
import { HttpError, parseBody, parseId, route } from "@/lib/http";
import { activeJobForApp } from "@/lib/jobs/store";
import { CheckInput } from "@/lib/schemas/api";

export const runtime = "nodejs";

/**
 * Starts a background rank check (keyword × country against the iTunes Search API) and returns
 * 202 with a job id right away. Poll GET /api/jobs/{id} for progress and per-task results.
 */
export const POST = route(async (req: Request) => {
  const input = await parseBody(req, CheckInput);
  const project = await appsRepo.getProject(input.appId);
  if (!project) throw new HttpError(404, "not_found", "Project not found");

  const keywords = input.keywordIds
    ? await keywordsRepo.getKeywordsByIds(project.id, input.keywordIds)
    : await keywordsRepo.listKeywords(project.id);
  const { tasks, skipped } = await buildTasks(project, keywords, input.countries ?? project.countries);
  if (!tasks.length) {
    throw new HttpError(400, "nothing_to_check", skipped.length ? "Localize these keywords for the selected countries first" : "No keywords to check");
  }

  const { job, reused } = startCheckJob(project, tasks, { force: input.force });
  return Response.json({ jobId: job.id, total: job.total, reused, skipped }, { status: 202 });
});

/** The running job for a project, if any, so a reloaded page can resume polling. */
export const GET = route(async (req: Request) => {
  const appId = parseId(new URL(req.url).searchParams.get("appId") ?? "");
  return Response.json({ job: activeJobForApp(appId) });
});
