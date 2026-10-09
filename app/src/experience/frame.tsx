// <Frame>: one storyboard beat. A tall section whose inner stage is sticky
// (pinned frames) so scroll drives the frame without GSAP pin-spacers. Each
// frame publishes its 0..1 progress into `story.progress[id]` for the DOM
// choreography and the WebGL layer, and applies its theme as it crosses the
// middle of the viewport.
import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import { ensureGsap, prefersReducedMotion } from "@/lib/motion/smooth";

import { FRAMES, setActiveFrame, setStoryTheme, story } from "./story";
import type { FrameId } from "./story";
import "./frame.css";

interface FrameProps {
  id: FrameId;
  children: ReactNode;
  className?: string;
  stageClassName?: string;
  /** Override the storyboard length (vh). */
  vh?: number;
  /** Set false when a frame manages its own theme (e.g. the pour flip). */
  applyTheme?: boolean;
  /** Accessible label for the region. Defaults to the storyboard title. */
  label?: string;
  style?: CSSProperties;
}

export function Frame({ id, children, className, stageClassName, vh, applyTheme = true, label, style }: FrameProps) {
  const ref = useRef<HTMLElement>(null);
  const spec = FRAMES.find((f) => f.id === id)!;
  const length = vh ?? spec.vh;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { ScrollTrigger } = ensureGsap();
    const reduced = prefersReducedMotion();

    const progress = ScrollTrigger.create({
      trigger: el,
      start: spec.pinned && !reduced ? "top top" : "top bottom",
      end: spec.pinned && !reduced ? "bottom bottom" : "bottom top",
      onUpdate: (self) => {
        story.progress[id] = self.progress;
      },
      onRefresh: (self) => {
        story.progress[id] = self.progress;
      },
    });

    const active = ScrollTrigger.create({
      trigger: el,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (self.isActive) {
          setActiveFrame(id);
          if (applyTheme) setStoryTheme(spec.theme);
        }
      },
    });

    return () => {
      progress.kill();
      active.kill();
    };
  }, [id, spec.pinned, spec.theme, applyTheme]);

  const sectionStyle = { ...style, "--frame-vh": length } as CSSProperties;

  return (
    <section
      aria-label={label ?? spec.title}
      className={["frame", spec.pinned ? "frame--pinned" : "frame--flow", className].filter(Boolean).join(" ")}
      data-frame={id}
      id={id}
      ref={ref}
      style={sectionStyle}
    >
      <div className={["frame__stage", stageClassName].filter(Boolean).join(" ")}>{children}</div>
    </section>
  );
}
