// Shared building blocks for the content pages (/equipment, /academy, /menu,
// /stores, /our-story and the 404). Namespace: `pg-`.
// Everything here is SSR safe: browser work only happens inside effects/handlers.
import { useRouter } from "@tanstack/react-router";
import { createElement, useEffect, useState } from "react";
import type { AnchorHTMLAttributes, CSSProperties, ElementType, ReactNode, RefObject } from "react";

import { useReveal } from "@/components/site/text/reveal";
import { ensureGsap, prefersReducedMotion, scrollToTarget } from "@/lib/motion/smooth";
import { useUi } from "@/lib/ui";

import "./pages.css";

/* -------------------------------------------------------------------------- */
/* Copy helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Tidy catalogue copy: brand names in title case, spaced hyphens become commas, stray spaces before punctuation go. */
export function cleanCopy(text: string) {
  return text
    .replace(/\bROCKET\b/g, "Rocket")
    .replace(/\bEUREKA\b/g, "Eureka")
    .replace(/\s+[\u2013\u2014]\s+/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** The first `count` sentences of a paragraph. */
export function firstSentences(text: string, count: number) {
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.slice(0, count).join(" ");
}

/** Whole-rand price with a non-breaking thousands space: 4050300 cents → "R40 503". */
export function rand(cents: number) {
  const whole = Math.round(cents / 100);
  return `R${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

/** Turn "13 October 2026 | 13:00 - 15:00" into readable parts (no dashes). */
export function parseSession(title: string, iso?: string) {
  const [dayPart = title, timePart = ""] = title.split("|").map((s) => s.trim());
  const day = dayPart.replace(/(\d+)\s*-\s*(\d+)/, "$1 to $2");
  const times = timePart.split("-").map((s) => s.trim()).filter(Boolean);
  const time = times.length === 2 ? `${times[0]} to ${times[1]}` : timePart;
  let hours = 0;
  if (times.length === 2) {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    hours = (toMin(times[1]) - toMin(times[0])) / 60;
  }
  const days = /\d+\s*-\s*\d+/.test(dayPart) ? 2 : 1;
  let weekday = "";
  if (iso) {
    const d = new Date(`${iso}T12:00:00Z`);
    weekday = d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  }
  return { day, time, hours, days, weekday };
}

/** "2.5" → "2½ hours"; "6" → "6 hours". */
export function formatHours(hours: number, days = 1) {
  if (!hours) return days > 1 ? `${days} days` : "";
  const whole = Math.floor(hours);
  const half = hours - whole >= 0.5;
  const h = `${whole}${half ? "½" : ""} ${whole === 1 && !half ? "hour" : "hours"}`;
  return days > 1 ? `${days === 2 ? "Two" : days} days, ${h} each` : h;
}

/* -------------------------------------------------------------------------- */
/* Motion hooks                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Hero choreography gate. Returns `play` (for GhostHeadline/SplitReveal with
 * trigger="manual") and `stage` for a `data-pg-hero` attribute that drives
 * the CSS entrance of hero media and copy. Waits for the preloader (ui.ready),
 * with a fallback so the hero can never stay hidden. Reduced motion: `stage`
 * stays undefined and everything is simply visible.
 */
export function useHeroReveal(fallbackMs = 4200) {
  const { ready } = useUi();
  const [armed, setArmed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setArmed(true));
    });
    const id = window.setTimeout(() => setTimedOut(true), fallbackMs);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(id);
    };
  }, [fallbackMs]);

  const play = armed && (ready || timedOut);
  const stage: "idle" | "play" | undefined = reduced ? undefined : play ? "play" : "idle";
  return { play, stage };
}

/**
 * Scroll-linked parallax for every `[data-pg-speed]` inside `root`.
 * The value is the travel in percent of the element's own height
 * (positive moves against the scroll, i.e. "slower"; negative "faster").
 */
export function useParallax(root: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const { gsap } = ensureGsap();
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-pg-speed]").forEach((node) => {
        const speed = Number.parseFloat(node.dataset.pgSpeed ?? "0");
        if (!speed) return;
        gsap.fromTo(
          node,
          { yPercent: speed },
          {
            yPercent: -speed,
            ease: "none",
            scrollTrigger: {
              trigger: node.parentElement ?? node,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * In-page jump: smooth scroll under the fixed header, then move keyboard focus
 * to the target (which carries tabIndex={-1}) without a second scroll.
 */
export function jumpTo(id: string, offset = -96) {
  scrollToTarget(`#${id}`, { offset });
  const el = document.getElementById(id);
  el?.focus({ preventScroll: true });
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

/** Rises into place when it scrolls into view (80ms card stagger via `delay`). */
export function Rise({
  as = "div",
  delay = 0,
  className,
  children,
  style,
  ...rest
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  const ref = useReveal("view", delay);
  return createElement(as, { ref, className: ["pg-rise", className].filter(Boolean).join(" "), style, ...rest }, children);
}

/** A hairline that draws from the left when it enters the viewport. */
export function DrawRule({ className, delay = 0 }: { className?: string; delay?: number }) {
  const ref = useReveal("view", delay);
  return <span aria-hidden="true" className={["pg-rule", className].filter(Boolean).join(" ")} ref={ref as RefObject<HTMLSpanElement>} />;
}

/**
 * Internal link that navigates client side (no full reload) without depending
 * on another team's route types. External, modified and new-tab clicks fall back
 * to the browser.
 */
export function PageLink({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const router = useRouter();
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (rest.target === "_blank" || !href.startsWith("/") || href.startsWith("//")) return;
        e.preventDefault();
        router.history.push(href);
      }}
      {...rest}
    />
  );
}

/** Screen-reader suffix for links that open a new tab. */
export function NewTab() {
  return <span className="sr-only"> (opens in a new tab)</span>;
}
