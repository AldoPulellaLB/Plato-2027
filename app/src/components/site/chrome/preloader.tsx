// Preloader: roast black, a 000 to 100 counter, the real wordmark rising letter
// by letter, the roast stage and bean temperature ticking along with it, then a
// curtain that wipes up into the page. First load of the session only.
//
// Never traps content: the markup is server rendered and a CSS animation fades it
// out after ~3.5s even if JavaScript never runs. A tiny inline script hides it
// instantly on later loads in the same session, before first paint.
import { useEffect, useRef, useState } from "react";

import { Wordmark } from "@/components/site/wordmark";
import { ROAST_STAGES, roastTemperature } from "@/experience/story";
import { lockScroll, prefersReducedMotion } from "@/lib/motion/smooth";
import { ui } from "@/lib/ui";

import { PRELOADED_KEY, readSession, writeSession } from "./shared";
import "./preloader.css";

const SKIP_SCRIPT = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(PRELOADED_KEY)})==="1"){document.documentElement.setAttribute("data-pl","skip")}}catch(e){}})();`;

/** Navigation-relative deadlines (ms since navigation start). */
const MIN_VISIBLE = 1200;
const MAX_VISIBLE = 3500;
/** Past this point the CSS failsafe is about to fire, so JS stands aside. */
const TOO_LATE = 3300;

type Phase = "load" | "exit" | "done";

function windowLoaded() {
  return new Promise<void>((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", () => resolve(), { once: true });
  });
}

/** Resolves when the first story image (or film poster) has loaded; never resolves if there is none. */
function firstStoryPoster() {
  return new Promise<void>((resolve) => {
    const el = document.querySelector<HTMLImageElement | HTMLVideoElement>(
      "#story img:not([loading='lazy']), #story video[poster]",
    );
    if (!el) return;
    if (el instanceof HTMLImageElement) {
      if (el.complete && el.naturalWidth > 0) resolve();
      else el.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.src = el.poster;
  });
}

function stageFor(p: number) {
  if (p >= 1) return { label: "Ready", index: ROAST_STAGES.length };
  const index = ROAST_STAGES.findIndex((s) => p < s.to);
  const stage = ROAST_STAGES[Math.max(0, index)];
  return { label: stage.label, index: Math.max(0, index) };
}

export function Preloader() {
  const [phase, setPhase] = useState<Phase>("load");
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const tempRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const t0 = performance.now();
    const skip =
      !root ||
      document.documentElement.dataset.pl === "skip" ||
      readSession(PRELOADED_KEY) === "1" ||
      t0 > TOO_LATE;

    if (skip) {
      writeSession(PRELOADED_KEY, "1");
      ui.setReady();
      setPhase("done");
      return;
    }

    // JavaScript owns the timing from here; the CSS failsafe stands down.
    root.dataset.js = "on";
    const reduced = prefersReducedMotion();
    lockScroll(true);

    let fontsDone = false;
    let pageDone = false;
    let raf = 0;
    let shown = 0;
    let stageIndex = 0;
    let exiting = false;
    const timers: number[] = [];

    const fonts = document.fonts?.ready ?? Promise.resolve();
    fonts.then(
      () => (fontsDone = true),
      () => (fontsDone = true),
    );
    void Promise.race([windowLoaded(), firstStoryPoster()]).then(() => (pageDone = true));

    const minEnd = Math.max(MIN_VISIBLE, t0 + (reduced ? 300 : 650));
    const maxEnd = Math.max(MAX_VISIBLE, t0 + 900);

    const render = (p: number) => {
      if (countRef.current)
        countRef.current.textContent = String(Math.round(p * 100)).padStart(3, "0");
      if (lineRef.current) lineRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      if (tempRef.current) tempRef.current.textContent = `${Math.round(roastTemperature(p))}°C`;
      const stage = stageFor(p);
      if (stage.index !== stageIndex && stageRef.current) {
        stageIndex = stage.index;
        stageRef.current.textContent = stage.label;
        if (!reduced && typeof stageRef.current.animate === "function") {
          stageRef.current.animate(
            [{ transform: "translateY(105%)" }, { transform: "translateY(0)" }],
            {
              duration: 620,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            },
          );
        }
      }
    };

    const exit = () => {
      if (exiting) return;
      exiting = true;
      setPhase("exit");
      // The page's own intros start as the curtain begins to lift.
      timers.push(
        window.setTimeout(
          () => {
            lockScroll(false);
            ui.setReady();
          },
          reduced ? 0 : 520,
        ),
      );
      timers.push(
        window.setTimeout(
          () => {
            writeSession(PRELOADED_KEY, "1");
            setPhase("done");
          },
          reduced ? 520 : 1720,
        ),
      );
    };

    const tick = () => {
      const now = performance.now();
      const loaded = fontsDone && pageDone;
      const finishing = (loaded && now >= minEnd) || now >= maxEnd;
      const timeFill = 1 - Math.exp(-(now - t0) / 650);
      const real = (fontsDone ? 0.4 : 0) + (pageDone ? 0.6 : 0);
      const target = finishing ? 1 : Math.min(0.92, Math.max(timeFill * 0.88, real * 0.92));
      shown += (target - shown) * (finishing ? 0.16 : 0.07);
      if (finishing && 1 - shown < 0.004) shown = 1;
      render(shown);
      if (shown >= 1) {
        exit();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    render(0);
    raf = requestAnimationFrame(tick);

    // Belt and braces: a throttled or stalled frame loop can never hold the page.
    timers.push(
      window.setTimeout(
        () => {
          render(1);
          exit();
        },
        Math.max(0, maxEnd - t0) + 1200,
      ),
    );

    return () => {
      cancelAnimationFrame(raf);
      for (const t of timers) window.clearTimeout(t);
      lockScroll(false);
      ui.setReady();
    };
  }, []);

  if (phase === "done") return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP_SCRIPT }} />
      <div aria-hidden="true" className="pl" data-phase={phase} ref={rootRef}>
        <div className="pl-trail" />
        <div className="pl-panel">
          <div className="pl-grain">
            <div className="plato-grain" />
          </div>
          <div className="pl-top">
            <span className="pl-top__item t-label">Roasted at Blank</span>
            <span className="pl-top__item t-label">From the roast to the regular</span>
          </div>
          <div className="pl-center">
            <Wordmark className="pl-mark" letterClassName="pl-letter" title="" />
          </div>
          <div className="pl-foot">
            <span className="pl-count-mask">
              <span className="pl-count t-num" ref={countRef}>
                000
              </span>
            </span>
            <span className="pl-stage">
              <span className="pl-stage__mask">
                <span className="pl-stage__label t-label" ref={stageRef}>
                  {ROAST_STAGES[0].label}
                </span>
              </span>
              <span className="pl-stage__temp t-label t-num" ref={tempRef}>
                96°C
              </span>
            </span>
          </div>
          <span className="pl-line" ref={lineRef} />
        </div>
      </div>
    </>
  );
}
