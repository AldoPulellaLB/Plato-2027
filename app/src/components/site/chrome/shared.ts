// Shared state and helpers for the global chrome (header, menu, footer, floats).
// Client work only happens inside hooks/effects, so every export is SSR safe.
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";

import { FRAME_IDS } from "@/experience/story";
import type { FrameId } from "@/experience/story";
import { prefersReducedMotion, scrollToTarget } from "@/lib/motion/smooth";

export const MENU_ID = "site-menu";
export const FOOTER_ID = "site-footer";
/** The home page's story wrapper (chapters one to four). */
export const STORY_ID = "story";

/** Session keys (sessionStorage). */
export const PRELOADED_KEY = "plato.preloaded";

/** The menu's preview photography only shows on wide, tall, hover-capable screens
 *  (menu.css hides it at max-width 1100px or max-height 820px). */
const MENU_PRIME_QUERY = "(min-width: 820px) and (hover: hover) and (width > 1100px) and (height > 820px)";

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
/* Tiny chrome store: scroll state published by the header's rAF        */
/* measure, plus menu image priming.                                    */

export interface ChromeState {
  condensed: boolean;
  menuPrimed: boolean;
  /** Home only: #story still reaches past the middle of the viewport (the story is on screen). */
  storyOnScreen: boolean;
  /** The bright milk film (f07) sits under the chrome before the theme flips: chrome turns ink. */
  inkTone: boolean;
}

const SERVER_STATE: ChromeState = {
  condensed: false,
  menuPrimed: false,
  storyOnScreen: false,
  inkTone: false,
};
let chromeState: ChromeState = SERVER_STATE;
const listeners = new Set<() => void>();

function setChrome(patch: Partial<ChromeState>) {
  const keys = Object.keys(patch) as (keyof ChromeState)[];
  if (keys.every((k) => patch[k] === undefined || patch[k] === chromeState[k])) return;
  chromeState = { ...chromeState, ...patch };
  for (const l of listeners) l();
}

export const chrome = {
  get: () => chromeState,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Scroll-derived state, measured once per frame by the header. */
  setScroll(patch: Pick<ChromeState, "condensed" | "storyOnScreen" | "inkTone">) {
    setChrome(patch);
  },
  /** Start loading the full-screen menu's preview photography (intent signal). Desktop only. */
  primeMenu() {
    if (chromeState.menuPrimed || typeof window === "undefined") return;
    if (!window.matchMedia(MENU_PRIME_QUERY).matches) return;
    setChrome({ menuPrimed: true });
  },
};

export function useChrome(): ChromeState {
  return useSyncExternalStore(chrome.subscribe, chrome.get, () => SERVER_STATE);
}

/**
 * True while #story still holds the middle of the viewport. Re-queried on every
 * call because the story mounts after hydration.
 */
export function measureStoryOnScreen() {
  const el = document.getElementById(STORY_ID);
  return !!el && el.getBoundingClientRect().bottom > 0.5 * window.innerHeight;
}

/**
 * Calls `onChange(story)` as soon as #story exists and whenever it changes size
 * (frames and the film measure themselves after mount). A MutationObserver waits
 * for it to appear; a ResizeObserver follows it after that. Returns a teardown.
 */
export function observeStory(onChange: (story: HTMLElement) => void) {
  let current: HTMLElement | null = null;
  let mo: MutationObserver | null = null;
  let ro: ResizeObserver | null = null;

  const watchForMount = () => {
    if (mo || typeof MutationObserver === "undefined") return;
    mo = new MutationObserver(attach);
    mo.observe(document.body, { childList: true, subtree: true });
  };

  function attach() {
    const el = document.getElementById(STORY_ID);
    if (!el || el === current) return;
    current = el;
    mo?.disconnect();
    mo = null;
    ro?.disconnect();
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (!current) return;
        if (!current.isConnected) {
          // Remounted (hot reload, route remount): find the new one.
          current = null;
          ro?.disconnect();
          attach();
          if (!current) watchForMount();
          return;
        }
        onChange(current);
      });
      ro.observe(el);
    }
    onChange(el);
  }

  attach();
  if (!current) watchForMount();
  return () => {
    mo?.disconnect();
    ro?.disconnect();
  };
}

/**
 * Move keyboard focus to where a jump landed (a chapter, the top of the page)
 * without a second scroll, so the next Tab continues from there.
 */
export function focusJumpTarget(el: HTMLElement) {
  if (!el.hasAttribute("tabindex")) {
    el.tabIndex = -1;
    // Regions focused programmatically get no outline (see header.css).
    el.dataset.jumpTarget = "";
  }
  el.focus({ preventScroll: true });
}

/** Scroll home and take keyboard focus with it, so the next Tab starts at the top. */
export function backToTop() {
  scrollToTarget(0, { duration: 2.4, immediate: prefersReducedMotion() });
  const main = document.getElementById("main");
  if (main) focusJumpTarget(main);
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
