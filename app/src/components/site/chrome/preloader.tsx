// Preloader: the Platō Ō drawn as a loader on this load's hero colour (sea green,
// magenta or olive, via --plato-roast). The ring draws itself like a dial, the
// macron settles on top as it closes, and the panel lifts into the page. Three
// seconds on screen; every full load of the home page (each refresh brings a new
// hero colour), and only the first load of the session elsewhere.
//
// Never traps content: the markup is server rendered and a CSS animation fades it
// out after ~3.2s even if JavaScript never runs. A tiny inline script hides it
// instantly where it should not show, before first paint.
import { useEffect, useRef, useState } from "react";

import { lockScroll, prefersReducedMotion } from "@/lib/motion/smooth";
import { ui } from "@/lib/ui";

import { PRELOADED_KEY, readSession, writeSession } from "./shared";
import "./preloader.css";

const SKIP_SCRIPT = `(function(){try{if(location.pathname!=="/"&&sessionStorage.getItem(${JSON.stringify(PRELOADED_KEY)})==="1"){document.documentElement.setAttribute("data-pl","skip")}}catch(e){}})();`;

/** On screen this long from when it first paints (ms); a still card for reduced motion. */
const VISIBLE = 3000;
const VISIBLE_REDUCED = 1200;
/** The panel starts lifting this long after the exit begins, and is gone by DONE_AFTER. */
const READY_AFTER = 320;
const DONE_AFTER = 1300;

/** The Ō of the wordmark (its SVG units): ring centre, mid radius and band width, and the macron. */
const RING = { cx: 1361.86, cy: 223.06, r: 107.13, width: 47.45 };
const MACRON = { x: 1279.18, y: 2.94, width: 165.33, height: 44.63 };

type Phase = "load" | "exit" | "done";

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
    // Past this point the CSS failsafe is already fading it, so JavaScript stands aside.
    const start = animationStart(root);
    const late = performance.now() - start > visible + 100;

    if (!root || shouldSkip() || late) {
      writeSession(PRELOADED_KEY, "1");
      ui.setReady();
      setPhase("done");
      return;
    }

    // JavaScript owns the timing from here; the CSS failsafe stands down.
    root.dataset.js = "on";
    lockScroll(true);

    const timers: number[] = [];
    const exitIn = Math.max(0, start + visible - performance.now());
    timers.push(
      window.setTimeout(() => {
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
      }, exitIn),
    );

    return () => {
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
