"use client";

import { useCallback, useSyncExternalStore } from "react";

// One ticking clock per interval, shared by every component that asks for it.
type Clock = { now: number; listeners: Set<() => void>; timer?: ReturnType<typeof setInterval> };
const clocks = new Map<number, Clock>();

function clock(intervalMs: number): Clock {
  let c = clocks.get(intervalMs);
  if (!c) clocks.set(intervalMs, (c = { now: Date.now(), listeners: new Set() }));
  return c;
}

function subscribe(intervalMs: number, cb: () => void) {
  const c = clock(intervalMs);
  c.listeners.add(cb);
  if (!c.timer) {
    c.now = Date.now();
    c.timer = setInterval(() => {
      c.now = Date.now();
      c.listeners.forEach((l) => l());
    }, intervalMs);
  }
  return () => {
    c.listeners.delete(cb);
    if (!c.listeners.size) {
      clearInterval(c.timer);
      c.timer = undefined;
    }
  };
}

/**
 * The current time, refreshed every `intervalMs`, for relative times and countdowns.
 * Null on the server and during hydration, so "5m ago" can't differ between the server HTML and
 * the first client render (a hydration mismatch); callers render a placeholder for null.
 */
export function useNow(intervalMs: number): number | null {
  // Must be stable: React resubscribes whenever it changes, and subscribing refreshes `now`,
  // which would re-render and resubscribe again in a loop.
  const sub = useCallback((cb: () => void) => subscribe(intervalMs, cb), [intervalMs]);
  const snap = useCallback(() => clock(intervalMs).now, [intervalMs]);
  return useSyncExternalStore(sub, snap, serverSnapshot);
}

const serverSnapshot = () => null;
