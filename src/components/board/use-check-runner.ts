"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api-client";
import { sleep } from "@/lib/async";
import { backoffMs } from "@/lib/itunes/retry";
import { taskKey } from "@/lib/task-key";
import type { BoardRow, CheckProgress } from "@/types";

/** Apple allows roughly 15–20 searches a minute per IP; start one check every 4s. */
export const CHECK_SPACING_MS = 4_000;
/** Rate-limit retries per check before it is marked failed. */
const MAX_RATE_LIMIT_RETRIES = 5;

type Task = { keywordId: number; keyword: string; country: BoardRow["country"]; force: boolean };

/**
 * Runs rank checks from the browser: a queue of keyword × country tasks, one POST /api/check per
 * task, spaced CHECK_SPACING_MS apart. Each request is short, which suits serverless hosting.
 * On a 429 it shows "rate limited, retrying in Ns" and retries. Results are saved per check, so
 * leaving the page only stops the rest of the queue.
 */
export function useCheckRunner(appId: number) {
  const qc = useQueryClient();
  const queue = useRef<Task[]>([]);
  const running = useRef(false);
  const alive = useRef(true);
  const [progress, setProgress] = useState<CheckProgress | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const syncPending = () => setPending(new Set(queue.current.map((t) => taskKey(t.keywordId, t.country))));

  const loop = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    let lastStart = 0;
    let failed: string[] = [];
    while (alive.current && queue.current.length) {
      const t = queue.current[0];
      setProgress((p) => p && { ...p, current: { keywordId: t.keywordId, keyword: t.keyword, country: t.country } });
      for (let attempt = 0; ; attempt++) {
        const wait = lastStart + CHECK_SPACING_MS - Date.now();
        if (wait > 0) await sleep(wait);
        if (!alive.current) break;
        lastStart = Date.now();
        try {
          await api("/api/check", { body: { appId, keywordId: t.keywordId, country: t.country, force: t.force } });
          break;
        } catch (e) {
          if (e instanceof ApiError && e.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
            const ms = (e.details as { retryAfterMs?: number } | undefined)?.retryAfterMs ?? backoffMs(attempt);
            setProgress((p) => p && { ...p, waiting: { until: Date.now() + ms, reason: "rate limited" } });
            await sleep(ms);
            setProgress((p) => p && { ...p, waiting: null });
            continue;
          }
          failed = [...failed, e instanceof Error ? e.message : "Check failed"];
          setProgress((p) => p && { ...p, failed: p.failed + 1 });
          break;
        }
      }
      queue.current.shift();
      syncPending();
      setProgress((p) => p && { ...p, done: p.done + 1 });
      void qc.invalidateQueries({ queryKey: ["board", appId] });
    }
    running.current = false;
    if (!alive.current) return;
    setProgress(null);
    if (failed.length) toast.warning(`${failed.length} check${failed.length > 1 ? "s" : ""} failed`, { description: failed[0] });
  }, [appId, qc]);

  /** Queues rows to check (already-queued rows are skipped) and starts the runner if idle. */
  const start = useCallback(
    (rows: BoardRow[], opts: { force?: boolean } = {}) => {
      const queued = new Set(queue.current.map((t) => taskKey(t.keywordId, t.country)));
      const fresh = rows
        .filter((r) => !queued.has(taskKey(r.keywordId, r.country)))
        .map((r) => ({ keywordId: r.keywordId, keyword: r.keyword, country: r.country, force: opts.force ?? false }));
      if (!fresh.length) return;
      queue.current.push(...fresh);
      syncPending();
      setProgress((p) =>
        p ? { ...p, total: p.total + fresh.length } : { total: fresh.length, done: 0, failed: 0, current: null, waiting: null },
      );
      void loop();
    },
    [loop],
  );

  return { progress, running: progress !== null, pending, start };
}
