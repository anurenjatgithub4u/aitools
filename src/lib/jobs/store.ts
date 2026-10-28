import "server-only";
import { randomUUID } from "node:crypto";
import type { CheckJob } from "@/types";

/**
 * Where check jobs live while they run. In-memory: fine for one long-lived Node process (local,
 * a VPS, Docker), lost on restart, and not shared across serverless instances. A Redis/DB-backed
 * store can replace it behind the same three functions.
 */
const g = globalThis as unknown as { __kpJobs?: Map<string, CheckJob> };
const jobs = (g.__kpJobs ??= new Map());

const KEEP_FINISHED_MS = 60 * 60_000;

export function createJob(appId: number, total: number): CheckJob {
  prune();
  const job: CheckJob = {
    id: randomUUID(),
    appId,
    status: "running",
    total,
    done: 0,
    failed: 0,
    current: null,
    pending: [],
    waiting: null,
    results: [],
    errors: [],
    startedAt: Date.now(),
    finishedAt: null,
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): CheckJob | null {
  return jobs.get(id) ?? null;
}

export function activeJobForApp(appId: number): CheckJob | null {
  for (const j of jobs.values()) if (j.appId === appId && j.status === "running") return j;
  return null;
}

function prune() {
  const cutoff = Date.now() - KEEP_FINISHED_MS;
  for (const [id, j] of jobs) if (j.finishedAt && j.finishedAt < cutoff) jobs.delete(id);
}
