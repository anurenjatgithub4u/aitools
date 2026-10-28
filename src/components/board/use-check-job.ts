"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { CheckInput } from "@/lib/schemas/api";
import type { CheckJob } from "@/types";

type StartResponse = { jobId: string; total: number; reused: boolean; skipped: unknown[] };

/**
 * Starts rank-check jobs and polls the running one. Picks up a job that was already running when
 * the page loaded, and refreshes the board each time another task finishes.
 */
export function useCheckJob(appId: number) {
  const qc = useQueryClient();
  const [startedId, setStartedId] = useState<string | null>(null);

  const active = useQuery({
    queryKey: ["active-job", appId],
    queryFn: () => api<{ job: CheckJob | null }>(`/api/check?appId=${appId}`),
  });
  const jobId = startedId ?? active.data?.job?.id ?? null;

  const poll = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api<{ job: CheckJob }>(`/api/jobs/${jobId}`),
    enabled: jobId !== null,
    refetchInterval: (q) => (q.state.data?.job.status === "running" ? 1500 : false),
  });
  const job = poll.data?.job ?? null;

  const done = job?.done;
  const status = job?.status;
  useEffect(() => {
    if (done === undefined) return;
    void qc.invalidateQueries({ queryKey: ["board", appId] });
  }, [done, status, appId, qc]);

  useEffect(() => {
    if (status === "done" && job && job.failed > 0) toast.warning(`${job.failed} of ${job.total} checks failed`, { description: job.errors[0]?.message });
    if (status === "error") toast.error("Rank check failed", { description: job?.errors[0]?.message });
    // only when the status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const start = useMutation({
    mutationFn: (body: Omit<CheckInput, "appId">) => api<StartResponse>("/api/check", { body: { appId, ...body } }),
    onSuccess: (r) => {
      setStartedId(r.jobId);
      void qc.invalidateQueries({ queryKey: ["job", r.jobId] });
      if (r.skipped.length) toast.info(`${r.skipped.length} rows skipped`, { description: "Localize those keywords for their country first." });
    },
    onError: (e) => toast.error(e.message),
  });

  const running = job?.status === "running";
  const pending = new Set(running ? job.pending : []);
  return { job, running, pending, start };
}
