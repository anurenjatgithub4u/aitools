"use client";

import { useEffect, useState } from "react";

/** The current time, refreshed every `intervalMs`, for relative times and countdowns. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
