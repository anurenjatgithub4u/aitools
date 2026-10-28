import { HttpError, route } from "@/lib/http";
import { getJob } from "@/lib/jobs/store";

export const runtime = "nodejs";

/** Progress of a check job: done/total, current keyword, back-off state, results so far. */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) throw new HttpError(404, "job_not_found", "Job not found or expired");
  return Response.json({ job });
});
