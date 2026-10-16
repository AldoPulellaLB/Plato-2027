// Preloader: the Platō Ō drawn as a loader on this load's hero colour (sea green,
// magenta or olive, via --plato-roast). The ring draws itself like a dial, the
// macron settles on top as it closes, and the panel lifts into the page. Every full
// load of the home page (each refresh brings a new hero colour), and only the first
// load of the session elsewhere.
//
// On the home page it also loads the story's films (clip-preload.ts): the downloads
// start as the HTML is parsed, and the ring only closes once they are in. On a fast
// connection that is the usual three seconds; on a slower one the ring holds where
// the downloads have reached, for up to FILM_WAIT_MAX, after which the page opens
// and the films finish in the background.
//
// Never traps content: the markup is server rendered and a CSS animation fades it
// out after ~3.2s even if JavaScript never runs (the head script's own timer while
// it waits for the films). A tiny inline script hides it instantly where it should
// not show, before first paint.
import { useEffect, useRef, useState } from "react";

import { clipPreloadScript, filmPreloadProgress } from "@/components/scroll-scrub/clip-preload";
import { lockScroll, prefersReducedMotion } from "@/lib/motion/smooth";
import { ui } from "@/lib/ui";
import { scrollScrubScenes } from "@/scroll-scrub-scenes";

import { PRELOADED_KEY, readSession, writeSession } from "./shared";
import "./preloader.css";

/** On screen this long from when it first paints (ms); a still card for reduced motion. */
const VISIBLE = 3000;
const VISIBLE_REDUCED = 1200;
/** The longest it waits for the films (ms from first paint) before the page opens anyway. */
const FILM_WAIT_MAX = 8000;
/** The panel starts lifting this long after the exit begins, and is gone by DONE_AFTER. */
const READY_AFTER = 320;
const DONE_AFTER = 1300;

/** The CSS dial (preloader.css): the ring draws from RING_DELAY over RING_DRAW, the macron settles from MACRON_DELAY. */
const RING_DELAY = 300;
const RING_DRAW = 2000;
const MACRON_DELAY = 2150;
/** The exit begins this long after the ring closes (closed at 2.3s, exit at 3s). */
const CLOSE_TO_EXIT = 700;
/** Fastest the ring sweeps (full turns per second) when it catches up with the downloads. */
const CATCH_UP = 1.6;

const SKIP_SCRIPT = `(function(){try{if(location.pathname!=="/"&&sessionStorage.getItem(${JSON.stringify(PRELOADED_KEY)})==="1"){document.documentElement.setAttribute("data-pl","skip")}}catch(e){}})();`;
// Its timer fades the loader a second after the film wait would have ended, if the app never takes over.
const PRELOAD_SCRIPT = SKIP_SCRIPT + clipPreloadScript(scrollScrubScenes, FILM_WAIT_MAX + 1000);

/** The Ō of the wordmark (its SVG units): ring centre, mid radius and band width, and the macron. */
const RING = { cx: 1361.86, cy: 223.06, r: 107.13, width: 47.45 };
const MACRON = { x: 1279.18, y: 2.94, width: 165.33, height: 44.63 };

type Phase = "load" | "exit" | "done";

/** The dial's ease (pl-draw's cubic-bezier(0.65, 0, 0.35, 1)), as drawn at `elapsed` ms. */
function dialAt(elapsed: number) {
  const x = Math.min(1, Math.max(0, (elapsed - RING_DELAY) / RING_DRAW));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * When the loader's CSS animations began (ms on the document timeline, which shares
 * performance.now()'s origin): the mark's own animation start, else first paint.
 */
function animationStart(root: HTMLElement | null) {
  const started = root?.querySelector(".pl-logo")?.getAnimations?.()[0]?.startTime;
  if (typeof started === "number") return started;
  const fcp = performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint");
  return fcp?.startTime ?? performance.now();
}

function shouldSkip() {
  return (
    document.documentElement.dataset.pl === "skip" ||
    (window.location.pathname !== "/" && readSession(PRELOADED_KEY) === "1")
  );
}

export function Preloader() {
  const [phase, setPhase] = useState<Phase>("load");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const reduced = prefersReducedMotion();
    const visible = reduced ? VISIBLE_REDUCED : VISIBLE;
    const start = animationStart(root);
    const html = document.documentElement;
    // The head script is holding the loader until the films are in.
    const waiting = html.dataset.pl === "wait";
    // Past this point a failsafe is already fading it, so JavaScript stands aside.
    const late = waiting ? false : html.dataset.pl === "timeout" || performance.now() - start > visible + 100;

    if (!root || shouldSkip() || late) {
      writeSession(PRELOADED_KEY, "1");
      ui.setReady();
      setPhase("done");
      return;
    }

    // JavaScript owns the timing from here; the failsafes stand down.
    window.clearTimeout(window.__platoPlFailsafe);
    root.dataset.js = "on";
    lockScroll(true);

    const timers: number[] = [];
    let frame = 0;
    const exit = () => {
      setPhase("exit");
      // The page's own intros start as the panel begins to lift.
      timers.push(
        window.setTimeout(
          () => {
            lockScroll(false);
            ui.setReady();
          },
          reduced ? 0 : READY_AFTER,
        ),
      );
      timers.push(
        window.setTimeout(
          () => {
            writeSession(PRELOADED_KEY, "1");
            setPhase("done");
          },
          reduced ? 520 : DONE_AFTER,
        ),
      );
    };

    const ring = root.querySelector<SVGCircleElement>(".pl-ring");
    if (!waiting || !ring) {
      timers.push(window.setTimeout(exit, Math.max(0, start + visible - performance.now())));
    } else {
      // The ring follows the dial, but never past the downloads. Take it over from
      // where the (slowed) CSS dial has reached, so nothing jumps.
      const offset = Number.parseFloat(getComputedStyle(ring).strokeDashoffset);
      let shown = Number.isFinite(offset) ? Math.min(1, Math.max(0, 1 - offset)) : 0;
      ring.style.strokeDashoffset = String(1 - shown);
      for (const animation of ring.getAnimations()) animation.cancel();
      // The macron waits for the ring: hold its CSS animation until the ring closes.
      const macron = root.querySelector(".pl-macron")?.getAnimations()[0];
      const macronAt = () => Number(macron?.currentTime ?? 0);
      if (macron && macronAt() < MACRON_DELAY) macron.pause();
      let closedAt = 0;
      let last = performance.now();

      const step = (now: number) => {
        const elapsed = now - start;
        const films = filmPreloadProgress() ?? 1;
        const target = elapsed >= FILM_WAIT_MAX ? 1 : Math.min(dialAt(elapsed), films);
        // On schedule this lands exactly on the dial; behind it, a quick sweep catches up.
        shown = Math.min(1, shown + Math.min(Math.max(target - shown, 0), (CATCH_UP * Math.max(now - last, 0)) / 1000));
        last = now;
        ring.style.strokeDashoffset = String(1 - shown);

        // The macron settles as the ring closes (its CSS start, 2.15s, is when the dial is ~99.8% drawn).
        if (macron?.playState === "paused" && shown >= 0.998) {
          macron.currentTime = Math.max(macronAt(), MACRON_DELAY);
          macron.play();
        }
        if (shown >= 1 && !closedAt) closedAt = now;
        if (closedAt && now - closedAt >= CLOSE_TO_EXIT && elapsed >= visible) {
          exit();
          return;
        }
        frame = window.requestAnimationFrame(step);
      };
      frame = window.requestAnimationFrame(step);
    }

    return () => {
      for (const t of timers) window.clearTimeout(t);
      window.cancelAnimationFrame(frame);
      lockScroll(false);
      ui.setReady();
    };
  }, []);

  if (phase === "done") return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PRELOAD_SCRIPT }} />
      <div aria-hidden="true" className="pl" data-phase={phase} ref={rootRef}>
        <div className="pl-trail" />
        <div className="pl-panel">
          <div className="pl-grain">
            <div className="plato-grain" />
          </div>
          <svg className="pl-logo" viewBox="1225 0 274 360" xmlns="http://www.w3.org/2000/svg">
            <circle className="pl-track" cx={RING.cx} cy={RING.cy} r={RING.r} strokeWidth={RING.width} />
            <circle
              className="pl-ring"
              cx={RING.cx}
              cy={RING.cy}
              pathLength={1}
              r={RING.r}
              strokeWidth={RING.width}
              transform={`rotate(-90 ${RING.cx} ${RING.cy})`}
            />
            <rect className="pl-macron" height={MACRON.height} width={MACRON.width} x={MACRON.x} y={MACRON.y} />
          </svg>
        </div>
      </div>
    </>
  );
}
