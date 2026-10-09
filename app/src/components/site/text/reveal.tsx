// Shared type motion. Server-rendered text is always fully visible; the client
// arms the "idle" state only for elements still below the fold, then plays the
// reveal when they enter. Reduced motion never arms anything.
import { Fragment, createElement, useEffect, useRef } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import "./reveal.css";

type Trigger = "mount" | "view" | "manual";

function reduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Arms `data-reveal="idle"` then flips to "play" on mount/when in view.
 * With trigger="manual", pass `play` to control it (e.g. from a frame's progress).
 */
export function useReveal(trigger: Trigger, delay = 0, play?: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    if (trigger === "manual") {
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.dataset.reveal = play ? "play" : "idle";
      return;
    }
    const rect = el.getBoundingClientRect();
    const alreadyPassed = rect.bottom < 0;
    if (alreadyPassed) return;
    el.dataset.reveal = "idle";
    el.style.setProperty("--reveal-delay", `${delay}ms`);
    let raf = 0;
    const start = () => {
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          el.dataset.reveal = "play";
        });
      });
    };
    if (trigger === "mount") {
      start();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [trigger, delay, play]);

  return ref;
}

interface GhostHeadlineProps {
  as?: ElementType;
  children: string;
  className?: string;
  trigger?: Trigger;
  play?: boolean;
  delay?: number;
  style?: CSSProperties;
  id?: string;
}

/**
 * Brief rule 4: statement lines enter as a blurred, offset ghost at 30% opacity
 * and settle into one sharp line over ~1.2s.
 */
export function GhostHeadline({ as = "h2", children, className, trigger = "view", play, delay = 0, style, id }: GhostHeadlineProps) {
  const ref = useReveal(trigger, delay, play);
  return createElement(
    as,
    { className: ["ghost", className].filter(Boolean).join(" "), ref, style, id },
    <span className="ghost__sharp">{children}</span>,
    <span aria-hidden="true" className="ghost__ghost">
      {children}
    </span>,
  );
}

interface SplitRevealProps {
  as?: ElementType;
  children: string;
  className?: string;
  trigger?: Trigger;
  play?: boolean;
  delay?: number;
  /** ms between words */
  stagger?: number;
  style?: CSSProperties;
  id?: string;
}

/** Words rise out of a mask one after another (never a block fade). */
export function SplitReveal({ as = "p", children, className, trigger = "view", play, delay = 0, stagger = 38, style, id }: SplitRevealProps) {
  const ref = useReveal(trigger, delay, play);
  const words = children.split(/\s+/).filter(Boolean);
  return createElement(
    as,
    { className: ["split", className].filter(Boolean).join(" "), ref, style: { ...style, "--split-stagger": `${stagger}ms` }, id },
    // The accessible text is a real (visually hidden) node: aria-label is not
    // honoured on paragraphs or generic elements by every screen reader.
    <span className="sr-only" key="sr">
      {children}
    </span>,
    // The space sits between the inline-block word masks, never inside one,
    // where the browser would trim it and run the words together.
    words.map((word, i) => (
      <Fragment key={`${word}-${i}`}>
        <span aria-hidden="true" className="split__w">
          <span className="split__i" style={{ "--i": i } as CSSProperties}>
            {word}
          </span>
        </span>
        {i < words.length - 1 ? " " : null}
      </Fragment>
    )),
  );
}

/** Doubled letters that roll up on hover/focus of the closest link or button. */
export function RollText({ children, className }: { children: string; className?: string }) {
  const chars = Array.from(children);
  return (
    <span className={["roll", className].filter(Boolean).join(" ")}>
      <span className="sr-only">{children}</span>
      {chars.map((c, i) => {
        const ch = c === " " ? " " : c;
        return (
          <span aria-hidden="true" className="roll__c" key={`${c}-${i}`} style={{ "--i": i } as CSSProperties}>
            <span>{ch}</span>
            <span>{ch}</span>
          </span>
        );
      })}
    </span>
  );
}

/** Mask reveal for media blocks (clip-path inset wipe). */
export function RevealMedia({
  children,
  className,
  trigger = "view",
  delay = 0,
  from = "bottom",
}: {
  children: ReactNode;
  className?: string;
  trigger?: Trigger;
  delay?: number;
  from?: "bottom" | "left" | "right" | "top";
}) {
  const ref = useReveal(trigger, delay);
  return (
    <div className={["reveal-media", className].filter(Boolean).join(" ")} data-from={from} ref={ref as React.RefObject<HTMLDivElement>}>
      {children}
    </div>
  );
}
