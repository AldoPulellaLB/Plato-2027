// Shared state and helpers for the global chrome (header, menu, footer, floats).
// Client work only happens inside hooks/effects, so every export is SSR safe.
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";

import { FRAME_IDS } from "@/experience/story";
import type { FrameId } from "@/experience/story";

export const MENU_ID = "site-menu";
export const FOOTER_ID = "site-footer";

/** Session keys (sessionStorage). */
export const PRELOADED_KEY = "plato.preloaded";
export const SOUND_KEY = "plato.sound";

export function usePathname() {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function isExternalHref(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

export function frameIndex(frame: FrameId | null) {
  return frame ? FRAME_IDS.indexOf(frame) : -1;
}

/* ------------------------------------------------------------------ */
/* Tiny chrome store: header condensed state + menu image priming.      */

interface ChromeState {
  condensed: boolean;
  menuPrimed: boolean;
}

let chromeState: ChromeState = { condensed: false, menuPrimed: false };
const SERVER_STATE: ChromeState = { condensed: false, menuPrimed: false };
const listeners = new Set<() => void>();

function setChrome(patch: Partial<ChromeState>) {
  const next = { ...chromeState, ...patch };
  if (next.condensed === chromeState.condensed && next.menuPrimed === chromeState.menuPrimed)
    return;
  chromeState = next;
  for (const l of listeners) l();
}

export const chrome = {
  get: () => chromeState,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setCondensed(condensed: boolean) {
    setChrome({ condensed });
  },
  /** Start loading the full-screen menu's preview photography (intent signal). */
  primeMenu() {
    setChrome({ menuPrimed: true });
  },
};

export function useChrome(): ChromeState {
  return useSyncExternalStore(chrome.subscribe, chrome.get, () => SERVER_STATE);
}

/**
 * True while the footer covers the bottom `inset` px of the viewport, so the
 * floating controls (sound, store pill) can step aside for the footer's own CTAs.
 */
export function useFooterInView(inset = 120) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = document.getElementById(FOOTER_ID);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: `0px 0px -${inset}px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [inset]);
  return inView;
}

/** Read/write sessionStorage without ever throwing (private mode, blocked storage). */
export function readSession(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; the choice simply is not remembered.
  }
}
