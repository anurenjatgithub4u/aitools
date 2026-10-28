"use client";

import { useSyncExternalStore } from "react";

// Light/dark mode without a library. The choice lives in localStorage under "theme" (the same key
// next-themes used, so existing choices carry over); "system" follows the OS setting. The <head>
// script in the root layout applies it before first paint; this module keeps it in sync after.

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Runs inline in <head> before the page paints, so there's no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("${DARK_QUERY}").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

const resolve = (t: Theme): ResolvedTheme => (t === "system" ? (matchMedia(DARK_QUERY).matches ? "dark" : "light") : t);

function apply(t: Theme) {
  const dark = resolve(t) === "dark";
  const root = document.documentElement;
  // switch instantly: without this, every element with a colour transition animates the change
  const freeze = document.createElement("style");
  freeze.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(freeze);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  void getComputedStyle(root).colorScheme; // force a style flush before re-enabling transitions
  requestAnimationFrame(() => freeze.remove());
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = matchMedia(DARK_QUERY);
  const onSystem = () => {
    if (readTheme() === "system") apply("system");
    cb();
  };
  // another tab changed the theme
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    apply(readTheme());
    cb();
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}

export function setTheme(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    // storage blocked (private mode): still switch for this page view
  }
  apply(t);
  notify();
}

// A string snapshot so useSyncExternalStore can compare it; "system:dark" etc.
const snapshot = () => `${readTheme()}:${resolve(readTheme())}`;
const serverSnapshot = () => "system:";

/** The chosen theme and what it resolves to. `resolvedTheme` is null on the server and during hydration. */
export function useTheme(): { theme: Theme; resolvedTheme: ResolvedTheme | null; setTheme: (t: Theme) => void } {
  const [theme, resolved] = useSyncExternalStore(subscribe, snapshot, serverSnapshot).split(":");
  return { theme: theme as Theme, resolvedTheme: (resolved || null) as ResolvedTheme | null, setTheme };
}
