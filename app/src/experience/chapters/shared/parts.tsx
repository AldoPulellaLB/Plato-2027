// Small shared pieces for the chapters: the chapter intro label, the opening
// scroll cue and an SPA link that does not depend on route typings.
import { useRouter } from "@tanstack/react-router";
import { forwardRef } from "react";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import { RollText } from "@/components/site/text/reveal";
import { scrollToTarget } from "@/lib/motion/smooth";

const CHAPTER_COPY = {
  bean: { n: "01", text: "Chapter one: the bean" },
  pour: { n: "02", text: "Chapter two: the pour" },
  brand: { n: "03", text: "Chapter three: the brand" },
  menu: { n: "04", text: "Chapter four: the menu" },
} as const;

/**
 * "01, a drawn rule, then Chapter one: the bean". The rule draws and the words rise when the
 * label (or an ancestor) gets `data-in`; without JS it is simply visible.
 */
export const ChapterLabel = forwardRef<
  HTMLParagraphElement,
  { chapter: keyof typeof CHAPTER_COPY; className?: string }
>(function ChapterLabel({ chapter, className }, ref) {
  const copy = CHAPTER_COPY[chapter];
  return (
    <p className={["ch-label", className].filter(Boolean).join(" ")} ref={ref}>
      <span className="ch-label__n t-num" aria-hidden="true">
        {copy.n}
      </span>
      <span className="ch-label__rule" aria-hidden="true" />
      <span className="ch-label__mask">
        <span className="ch-label__text">{copy.text}</span>
      </span>
    </p>
  );
});

/** ScrollCue (frame 01): a thin line that drains downward on loop. */
export function ScrollCue({ target, className }: { target: string; className?: string }) {
  return (
    <a
      className={["ch-cue", className].filter(Boolean).join(" ")}
      href={`#${target}`}
      onClick={(e) => {
        e.preventDefault();
        scrollToTarget(`#${target}`, { duration: 2.2 });
      }}
    >
      <span className="ch-cue__track" aria-hidden="true">
        <span className="ch-cue__drain" />
      </span>
      <span className="ch-cue__text t-label">
        <RollText>Scroll the journey</RollText>
      </span>
    </a>
  );
}

interface ChLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

/**
 * Internal link with client-side navigation. Uses `router.navigate({ href })`
 * so it works before every route file exists; modifier clicks open natively.
 */
export const ChLink = forwardRef<HTMLAnchorElement, ChLinkProps>(function ChLink(
  { href, onClick, children, ...rest },
  ref,
) {
  const router = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    e.preventDefault();
    void router.navigate({ href });
  };
  return (
    <a href={href} onClick={handle} ref={ref} {...rest}>
      {children}
    </a>
  );
});

/** Arrow used by the chapter CTAs (hand-drawn, inherits colour). */
export function ArrowGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12h13M13 6l6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** A single roasted bean (used for the PriceChip bean-drop and accents). */
export function BeanGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 20 28">
      <ellipse cx="10" cy="14" fill="currentColor" rx="9" ry="13" />
      <path
        d="M10 2.5c-3.2 4.4 3.2 8 0 11.5s3.2 7.6 0 11.5"
        fill="none"
        stroke="var(--plato-roast)"
        strokeLinecap="round"
        strokeOpacity="0.55"
        strokeWidth="1.4"
      />
    </svg>
  );
}
