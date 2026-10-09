// Lenis smooth scroll bridged to GSAP ScrollTrigger (one shared instance).
// Client only: every export is safe to import during SSR, but only does work in the browser.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

let lenis: Lenis | null = null;
let registered = false;
let tickerFn: ((time: number) => void) | null = null;

export function ensureGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Start Lenis + the GSAP ticker bridge. Returns a teardown. */
export function initSmoothScroll(): () => void {
  ensureGsap();
  if (typeof window === "undefined" || lenis) return () => {};
  if (prefersReducedMotion()) return () => {};

  lenis = new Lenis({
    autoRaf: false,
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.4,
  });
  lenis.on("scroll", ScrollTrigger.update);
  tickerFn = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);

  return () => {
    if (tickerFn) gsap.ticker.remove(tickerFn);
    tickerFn = null;
    lenis?.destroy();
    lenis = null;
  };
}

export function getLenis() {
  return lenis;
}

/** Scroll to an element, selector or y. Falls back to native scrolling. */
export function scrollToTarget(
  target: string | number | HTMLElement,
  options: { offset?: number; immediate?: boolean; duration?: number } = {},
) {
  if (typeof window === "undefined") return;
  if (lenis) {
    lenis.scrollTo(target, {
      offset: options.offset ?? 0,
      immediate: options.immediate,
      duration: options.duration ?? 1.6,
      easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    });
    return;
  }
  let y: number | null = null;
  if (typeof target === "number") y = target;
  else {
    const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (el) y = el.getBoundingClientRect().top + window.scrollY;
  }
  if (y !== null) {
    window.scrollTo({ top: y + (options.offset ?? 0), behavior: options.immediate || prefersReducedMotion() ? "auto" : "smooth" });
  }
}

/** Freeze page scroll while an overlay (menu, drawer) is open. */
export function lockScroll(locked: boolean) {
  if (typeof document === "undefined") return;
  if (locked) lenis?.stop();
  else lenis?.start();
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

export { gsap, ScrollTrigger };
