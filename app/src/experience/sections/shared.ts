// Shared helpers for the four home sections that follow the story
// (shop rail, equipment spread, academy index, voices carousel).
// Everything browser-only lives inside effects, so the module is SSR safe.
import { useEffect } from "react";
import type { RefObject } from "react";

import { setStoryTheme } from "@/experience/story";
import { formatRand, liveVariants } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import { ensureGsap, prefersReducedMotion } from "@/lib/motion/smooth";

/** "R170". formatRand already drops zero cents; the replace is a safety net. */
export function rand(cents: number) {
  return formatRand(cents).replace(/[.,]00$/, "");
}

/** Lowest live price, flagged "from" when the live variants differ in price. */
export function fromPrice(product: Product) {
  const live = liveVariants(product);
  const list = live.length ? live : product.variants;
  const prices = list.map((v) => v.price);
  const min = Math.min(...prices);
  return { amount: rand(min), from: prices.some((p) => p !== min) };
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * The page is on the paper theme after frame 14. Re-assert it whenever one of
 * these sections reaches the middle of the viewport (both scroll directions),
 * so a fast jump from the forest menu frame can never leave the wrong theme.
 */
export function usePaperTheme(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { ScrollTrigger } = ensureGsap();
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (self.isActive) setStoryTheme("paper");
      },
    });
    return () => trigger.kill();
  }, [ref]);
}

/**
 * Arms `data-inview="idle"` on an element that is not yet scrolled past, then
 * flips it to "play" when it enters. CSS owns the choreography. Server markup
 * carries no attribute, so content is always visible without JS, and reduced
 * motion never arms anything.
 */
export function useInView(ref: RefObject<HTMLElement | null>, rootMargin = "0px 0px -12% 0px") {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().bottom < 0) return;
    el.dataset.inview = "idle";
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => {
            el.dataset.inview = "play";
          });
        });
      },
      { rootMargin },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref, rootMargin]);
}

/**
 * Scroll-scrubbed vertical drift (yPercent from -amount to +amount while the
 * trigger crosses the viewport). Linear easing is correct here: it is scrubbed.
 */
export function useDrift(
  ref: RefObject<HTMLElement | null>,
  amount: number,
  triggerRef?: RefObject<HTMLElement | null>,
  axis: "y" | "x" = "y",
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const { gsap } = ensureGsap();
    const prop = axis === "y" ? "yPercent" : "xPercent";
    const tween = gsap.fromTo(
      el,
      { [prop]: -amount },
      {
        [prop]: amount,
        ease: "none",
        scrollTrigger: {
          trigger: triggerRef?.current ?? el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(el, { clearProps: "transform" });
    };
  }, [ref, amount, triggerRef, axis]);
}

/** True when the device has a real hover-capable fine pointer (mouse, trackpad). */
export function hasFinePointer() {
  return (
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}
