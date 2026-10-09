// Voices: one huge serif review at a time. Words of the outgoing review lift
// away while the next one rises out of a mask. Auto-advances every 7s, pausing
// on hover, focus, when off screen, when the tab is hidden, or by choice.
// Rotation never starts under reduced motion.
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { prefersReducedMotion } from "@/lib/motion/smooth";
import { TESTIMONIALS } from "@/lib/site";

import { pad2, useDrift, useInView, usePaperTheme } from "./shared";
import "./home-voices.css";

const DURATION = 7000;
const LEAVE_MS = 900;

export function HomeVoices() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const indexRef = useRef(0);
  const elapsed = useRef(0);
  const offscreen = useRef(true);
  const count = TESTIMONIALS.length;

  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState({ hover: false, focus: false });
  const [reduced, setReduced] = useState(false);
  const playingRef = useRef(playing);
  const heldRef = useRef(held);

  useEffect(() => {
    playingRef.current = playing;
    heldRef.current = held;
  }, [playing, held]);

  usePaperTheme(sectionRef);
  useInView(stageRef, "0px 0px -18% 0px");
  useDrift(markRef, 18, sectionRef);

  const show = useCallback(
    (next: number) => {
      const target = ((next % count) + count) % count;
      const current = indexRef.current;
      if (target === current) return;
      indexRef.current = target;
      elapsed.current = 0;
      setLeaving(current);
      setIndex(target);
    },
    [count],
  );

  // Reduced motion: no rotation at all (the reader moves on with the controls).
  useEffect(() => {
    if (prefersReducedMotion()) {
      setReduced(true);
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (leaving === null) return;
    const t = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);

  // Timer: rAF only while the section is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || count < 2) return;
    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 0;
      last = now;
      const h = heldRef.current;
      const running =
        playingRef.current && !h.hover && !h.focus && !offscreen.current && !document.hidden;
      if (running) {
        elapsed.current += dt;
        if (elapsed.current >= DURATION) show(indexRef.current + 1);
      }
      const fill = fillRefs.current[indexRef.current];
      if (fill)
        fill.style.transform = `scaleX(${Math.min(1, elapsed.current / DURATION).toFixed(4)})`;
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        offscreen.current = !entry?.isIntersecting;
        cancelAnimationFrame(raf);
        raf = 0;
        if (entry?.isIntersecting) {
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(section);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [count, show]);

  if (count === 0) return null;

  const rotating = playing && !held.hover && !held.focus;

  return (
    <section
      aria-labelledby="hvoice-title"
      aria-roledescription="carousel"
      className="hvoice"
      data-static={reduced ? "true" : undefined}
      id="home-voices"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setHeld((h) => ({ ...h, focus: false }));
      }}
      onFocus={() => setHeld((h) => (h.focus ? h : { ...h, focus: true }))}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHeld((h) => ({ ...h, hover: true }));
      }}
      onPointerLeave={() => setHeld((h) => ({ ...h, hover: false }))}
      ref={sectionRef}
    >
      <span aria-hidden="true" className="hvoice-mark" ref={markRef}>
        “
      </span>

      <div className="hvoice-inner">
        <header className="hvoice-top">
          <h2 className="hvoice-title t-label" id="hvoice-title">
            Reviews from plato.coffee
          </h2>
          <p aria-hidden="true" className="hvoice-count t-num">
            <span className="hvoice-count__now" key={index}>
              {pad2(index + 1)}
            </span>
            <span className="hvoice-count__of">/ {pad2(count)}</span>
          </p>
        </header>

        <div
          aria-atomic="true"
          aria-live={rotating ? "off" : "polite"}
          className="hvoice-stage"
          ref={stageRef}
        >
          {TESTIMONIALS.map((t, i) => {
            const state = i === index ? "active" : i === leaving ? "leaving" : "idle";
            const words = t.quote.split(/\s+/).filter(Boolean);
            return (
              <figure
                aria-hidden={state === "active" ? undefined : true}
                aria-label={`Review ${i + 1} of ${count}`}
                aria-roledescription="slide"
                className="hvoice-quote"
                data-state={state}
                key={t.quote}
                role="group"
              >
                <blockquote className="hvoice-text">
                  <p>
                    {words.map((w, j) => (
                      // The space sits outside the inline-block mask so it is never trimmed.
                      <Fragment key={`${w}-${j}`}>
                        <span className="hvoice-w">
                          <span className="hvoice-wi" style={{ "--i": j } as CSSProperties}>
                            {j === 0 ? `“${w}` : j === words.length - 1 ? `${w}”` : w}
                          </span>
                        </span>
                        {j < words.length - 1 ? " " : null}
                      </Fragment>
                    ))}
                  </p>
                </blockquote>
                <figcaption className="hvoice-cite">
                  <span className="hvoice-cite__rule" aria-hidden="true" />
                  <span className="hvoice-cite__who">{t.where}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <div className="hvoice-controls">
          <div className="hvoice-index" role="group" aria-label="Choose a review">
            {TESTIMONIALS.map((t, i) => (
              <button
                aria-current={i === index ? "true" : undefined}
                aria-label={`Show review ${i + 1} of ${count}`}
                className="hvoice-dot"
                data-state={i === index ? "active" : i < index ? "past" : "future"}
                key={t.quote}
                onClick={() => show(i)}
                type="button"
              >
                <span aria-hidden="true" className="hvoice-dot__no t-num">
                  {pad2(i + 1)}
                </span>
                <span aria-hidden="true" className="hvoice-dot__track">
                  <span
                    className="hvoice-dot__fill"
                    ref={(el) => {
                      fillRefs.current[i] = el;
                    }}
                  />
                </span>
              </button>
            ))}
          </div>

          <div className="hvoice-buttons">
            {!reduced && count > 1 ? (
              <button
                aria-label={playing ? "Pause automatic rotation" : "Resume automatic rotation"}
                className="hvoice-btn hvoice-btn--toggle"
                onClick={() => setPlaying((p) => !p)}
                type="button"
              >
                {playing ? (
                  <Pause aria-hidden="true" size={16} strokeWidth={1.5} />
                ) : (
                  <Play aria-hidden="true" size={16} strokeWidth={1.5} />
                )}
              </button>
            ) : null}
            <button
              aria-label="Previous review"
              className="hvoice-btn"
              data-dir="prev"
              onClick={() => show(indexRef.current - 1)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="hvoice-btn__a" size={20} strokeWidth={1.5} />
              <ArrowLeft aria-hidden="true" className="hvoice-btn__b" size={20} strokeWidth={1.5} />
            </button>
            <button
              aria-label="Next review"
              className="hvoice-btn"
              data-dir="next"
              onClick={() => show(indexRef.current + 1)}
              type="button"
            >
              <ArrowRight
                aria-hidden="true"
                className="hvoice-btn__a"
                size={20}
                strokeWidth={1.5}
              />
              <ArrowRight
                aria-hidden="true"
                className="hvoice-btn__b"
                size={20}
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
