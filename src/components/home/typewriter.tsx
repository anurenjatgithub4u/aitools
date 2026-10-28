"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 1700;
const GAP_MS = 350;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);

/**
 * Types each phrase, holds it, deletes it, moves to the next. Starts fully typed so the server
 * render (and no-JS) shows a complete phrase. With reduced motion, phrases swap without typing.
 * Characters are code points, so Japanese and accented text type one glyph at a time.
 */
export function useTypewriter(phrases: string[]) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(() => Array.from(phrases[0]).length);
  const [deleting, setDeleting] = useState(true);

  const chars = Array.from(phrases[index]);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(() => setIndex((i) => (i + 1) % phrases.length), HOLD_MS + 1000);
      return () => clearTimeout(t);
    }
    let delay: number;
    let step: () => void;
    if (!deleting && length < chars.length) {
      delay = TYPE_MS;
      step = () => setLength((l) => l + 1);
    } else if (!deleting) {
      delay = HOLD_MS;
      step = () => setDeleting(true);
    } else if (length > 0) {
      // the first phrase is already on screen at load, so hold it before deleting
      delay = length === chars.length ? HOLD_MS : DELETE_MS;
      step = () => setLength((l) => l - 1);
    } else {
      delay = GAP_MS;
      step = () => {
        setIndex((i) => (i + 1) % phrases.length);
        setDeleting(false);
      };
    }
    const t = setTimeout(step, delay);
    return () => clearTimeout(t);
  }, [reduced, deleting, length, chars.length, phrases.length]);

  return { index, text: reduced ? phrases[index] : chars.slice(0, length).join(""), typing: !reduced };
}
