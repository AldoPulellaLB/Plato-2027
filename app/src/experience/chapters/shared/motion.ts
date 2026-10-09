// Shared choreography helpers for the storyboard chapters. Everything here is
// client-only at call time (effects/handlers); importing it during SSR is safe.
import { useEffect } from "react";
import type { DependencyList, RefObject } from "react";

import { ensureGsap } from "@/lib/motion/smooth";

/** Matches the WebGL engine's mobile switch (coarse pointer or < 820px). */
export const MOBILE_QUERY = "(max-width: 819px)";
export const DESKTOP_QUERY = "(min-width: 820px)";
export const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** 0..1 position of p inside [a, b]. */
export const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Soft ease for values derived from scroll progress (scroll itself stays linear). */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type Gsap = ReturnType<typeof ensureGsap>["gsap"];
type ST = ReturnType<typeof ensureGsap>["ScrollTrigger"];

export interface SceneContext {
  el: HTMLElement;
  gsap: Gsap;
  ScrollTrigger: ST;
  isMobile: boolean;
  reduced: boolean;
}

/**
 * Builds a frame's scroll choreography inside a gsap.matchMedia scoped to `ref`.
 * The builder runs again when the mobile/desktop or reduced-motion condition
 * flips; every tween and ScrollTrigger it creates is reverted automatically,
 * and a returned function runs as extra cleanup (tickers, listeners).
 */
export function useScrollScene(
  ref: RefObject<HTMLElement | null>,
  build: (ctx: SceneContext) => void | (() => void),
  deps: DependencyList = [],
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { gsap, ScrollTrigger } = ensureGsap();
    const mm = gsap.matchMedia(el);
    mm.add(
      { isMobile: MOBILE_QUERY, isDesktop: DESKTOP_QUERY, reduced: REDUCED_QUERY },
      (context) => {
        const c = context.conditions as { isMobile?: boolean; reduced?: boolean };
        return build({ el, gsap, ScrollTrigger, isMobile: !!c.isMobile, reduced: !!c.reduced });
      },
    );
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Per-frame work on the shared GSAP ticker (the same rAF that drives Lenis),
 * enabled only while `trigger` is near the viewport. Returns a cleanup.
 */
export function tickWhileNear(
  ScrollTrigger: ST,
  gsap: Gsap,
  trigger: Element,
  fn: () => void,
  margin = "100%",
) {
  let on = false;
  const enable = () => {
    if (on) return;
    on = true;
    gsap.ticker.add(fn);
    fn();
  };
  const disable = () => {
    if (!on) return;
    on = false;
    gsap.ticker.remove(fn);
  };
  const st = ScrollTrigger.create({
    trigger,
    start: `top bottom+=${margin}`,
    end: `bottom top-=${margin}`,
    onToggle: (self) => (self.isActive ? enable() : disable()),
  });
  if (st.isActive) enable();
  return () => {
    st.kill();
    disable();
  };
}

/**
 * Toggles `data-in` on elements when their trigger crosses `start`
 * (and removes it when scrolling back above), so CSS plays time-based
 * reveals forward and resets them in reverse. Elements are armed with
 * `data-armed` first, so server-rendered content stays visible without JS.
 */
export function revealOn(
  ScrollTrigger: ST,
  targets: (Element | null | undefined)[],
  trigger: Element,
  start = "top 75%",
  options: { once?: boolean } = {},
) {
  const els = targets.filter(Boolean) as HTMLElement[];
  for (const el of els) el.dataset.armed = "";
  const play = () => els.forEach((el) => (el.dataset.in = ""));
  const reset = () => els.forEach((el) => delete el.dataset.in);
  const st = ScrollTrigger.create({
    trigger,
    start,
    onEnter: play,
    onEnterBack: play,
    onLeaveBack: options.once ? undefined : reset,
  });
  if (st.progress > 0 || st.isActive) play();
  return () => {
    st.kill();
    for (const el of els) {
      delete el.dataset.armed;
      delete el.dataset.in;
    }
  };
}

/**
 * Calls `set(true)` when `trigger` crosses `start` (and `set(false)` when scrolling
 * back above it): drives React-controlled reveals such as a manual GhostHeadline.
 * Cleanup leaves the content shown, so a torn-down scene never hides text.
 */
export function playOn(
  ScrollTrigger: ST,
  trigger: Element,
  start: string,
  set: (on: boolean) => void,
) {
  const st = ScrollTrigger.create({
    trigger,
    start,
    onEnter: () => set(true),
    onEnterBack: () => set(true),
    onLeaveBack: () => set(false),
  });
  set(st.progress > 0 || st.isActive);
  return () => {
    st.kill();
    set(true);
  };
}

/** Writes text only when it changed (no layout thrash from identical writes). */
export function setText(el: Element | null | undefined, text: string) {
  if (el && el.textContent !== text) el.textContent = text;
}

/** Convert the story's linear-sRGB roast ramp to a CSS colour string. */
export function linearToCss([r, g, b]: [number, number, number]) {
  const enc = (c: number) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(clamp01(v) * 255);
  };
  return `rgb(${enc(r)} ${enc(g)} ${enc(b)})`;
}

/** Whole-rand price label ("R170"); falls back to cents when not whole. */
export function rand(cents: number) {
  const value = cents / 100;
  return Number.isInteger(value) ? `R${value}` : `R${value.toFixed(2)}`;
}
