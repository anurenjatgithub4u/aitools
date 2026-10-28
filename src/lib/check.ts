import "server-only";
import { isEnglish, type CountryCode } from "@/lib/countries";
import { keywordsRepo, rankChecksRepo } from "@/lib/db";
import { searchApps } from "@/lib/itunes/client";
import { rankOf } from "@/lib/itunes/parse";
import { activeJobForApp, createJob } from "@/lib/jobs/store";
import type { CheckJob, Keyword, Project } from "@/types";

export type CheckTask = { keywordId: number; keyword: string; country: CountryCode; term: string };

/**
 * One task per keyword × country. The search term is the localized phrase; English storefronts fall
 * back to the English keyword, other storefronts are skipped until the keyword is localized.
 */
export async function buildTasks(project: Project, keywords: Keyword[], countries: CountryCode[]) {
  const localized = await keywordsRepo.listLocalized(project.id);
  const phrase = new Map(localized.map((l) => [`${l.keywordId}:${l.country}`, l.phrase]));
  const tasks: CheckTask[] = [];
  const skipped: { keywordId: number; country: CountryCode }[] = [];
  for (const k of keywords) {
    for (const country of countries) {
      const term = phrase.get(`${k.id}:${country}`) ?? (isEnglish(country) ? k.term : null);
      if (term) tasks.push({ keywordId: k.id, keyword: k.term, country, term });
      else skipped.push({ keywordId: k.id, country });
    }
  }
  return { tasks, skipped };
}

/**
 * Starts checking in the background and returns immediately. Only one job per project runs at a
 * time; asking again while one runs returns that job. The shared rate limiter paces the requests.
 */
export function startCheckJob(project: Project, tasks: CheckTask[], opts: { force?: boolean } = {}): { job: CheckJob; reused: boolean } {
  const running = activeJobForApp(project.id);
  if (running) return { job: running, reused: true };
  const job = createJob(project.id, tasks.length);
  void runJob(job, project, tasks, opts.force ?? false);
  return { job, reused: false };
}

async function runJob(job: CheckJob, project: Project, tasks: CheckTask[], force: boolean) {
  for (const t of tasks) {
    job.current = { keywordId: t.keywordId, keyword: t.keyword, country: t.country };
    try {
      const res = await searchApps(t.term, t.country, {
        force,
        onWait: ({ ms, reason }) => (job.waiting = { until: Date.now() + ms, reason }),
      });
      job.waiting = null;
      const resultIds = res.apps.map((a) => a.trackId);
      // a cache hit for the same fetch isn't a new observation; don't duplicate it in the history
      const [last] = await rankChecksRepo.rankHistory(t.keywordId, t.country, 1);
      if (!res.cached || last?.checkedAt.getTime() !== res.fetchedAt.getTime()) {
        await rankChecksRepo.insertRankCheck({
          keywordId: t.keywordId,
          country: t.country,
          term: t.term,
          checkedAt: res.fetchedAt,
          resultIds,
          top: res.apps.slice(0, 10),
        });
      }
      job.results.push({
        keywordId: t.keywordId,
        country: t.country,
        term: t.term,
        rank: rankOf(resultIds, project.itunesId),
        top5: res.apps.slice(0, 5),
        checkedAt: res.fetchedAt.getTime(),
      });
    } catch (e) {
      job.waiting = null;
      job.failed++;
      job.errors.push({ keywordId: t.keywordId, country: t.country, message: e instanceof Error ? e.message : "Check failed" });
    }
    job.done++;
  }
  job.current = null;
  job.status = job.failed === job.total && job.total > 0 ? "error" : "done";
  job.finishedAt = Date.now();
}
