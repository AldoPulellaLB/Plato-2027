// One continuous clock for frames f01..f05.
// The film is driven by a single "beat" B derived from where the five frame
// sections sit in the viewport, so the hand-overs between pinned frames (when one
// stage scrolls away and the next arrives) keep moving instead of freezing:
//   0..1  f01 cold open scrolling away (beans fall toward the viewer)
//   1..2  f02 pinned: the pour into the hopper
//   2..3  f02 -> f03: the dive into the hopper opening (match to the drum window)
//   3..4  f03 pinned: the roast (B - 3 is the roast progress)
//   4..5  f03 -> f04: through the glass, out over the cooling tray
//   5..6  f04 pinned: the tray, stirring arm sweeping
//   6..7  f04 -> f05: the tray turns and pulls away, beans become a grid of dots
//   7..8  f05 pinned: cups pop in, pulse, the dive into the centre cup
//   8..9  f05 -> f06: holding dark coffee while the film arrives
import type { FrameView } from "../../engine";
import { CUP_COUNT_WINDOW } from "../../../story";
import type { FrameId } from "../../../story";

import { clamp } from "./util";

const ORDER: FrameId[] = ["f01", "f02", "f03", "f04", "f05"];
/** Storyboard lengths in screens (fallbacks when a section height cannot be measured). */
const DEFAULT_SCREENS = [1, 1.5, 2.5, 1.5, 2];

export const BEAT = {
  coldOpen: 0,
  pour: 1,
  dive: 2,
  roast: 3,
  toTray: 4,
  tray: 5,
  toGrid: 6,
  cups: 7,
  exit: 8,
  end: 9,
} as const;

/**
 * f05 choreography in frame progress. Matches the DOM counter in
 * chapters/pour (1 at 5%, 150 at 62%): the last cup lands as the count hits 150,
 * then every cup pulses once, then the dive starts as the copy clears.
 */
const CUP_POP = 0.045;

export const CUPS = {
  /** First (centre) cup starts popping (shared with the DOM counter). */
  fillStart: CUP_COUNT_WINDOW.from,
  /** Last cup starts popping; with `pop` it has landed as the counter hits 150. */
  fillEnd: CUP_COUNT_WINDOW.to - CUP_POP,
  pop: CUP_POP,
  pulseAt: 0.67,
  pulseWidth: 0.045,
  diveStart: 0.76,
} as const;

const tops = new Float64Array(5);
const heights = new Float64Array(5);

function present(view: FrameView) {
  return !(view.top === 9 && view.visibility === 0);
}

/** Continuous beat 0..9 from the frame sections' positions. */
export function beatFromViews(views: Record<FrameId, FrameView>): number {
  for (let i = 0; i < 5; i += 1) tops[i] = views[ORDER[i]].top;
  for (let i = 0; i < 5; i += 1) {
    let h = DEFAULT_SCREENS[i];
    if (i < 4) {
      if (present(views[ORDER[i]]) && present(views[ORDER[i + 1]])) h = tops[i + 1] - tops[i];
    } else if (present(views.f06) && present(views.f05)) {
      h = views.f06.top - tops[4];
    }
    heights[i] = h > 0.5 && h < 8 ? h : DEFAULT_SCREENS[i];
  }
  let cur = -1;
  for (let i = 0; i < 5; i += 1) if (present(views[ORDER[i]]) && tops[i] <= 1e-4) cur = i;
  if (cur < 0) return 0;
  const d = -tops[cur];
  if (cur === 0) return clamp(d / heights[0], 0, 1);
  const base = 2 * cur - 1;
  const pin = Math.max(1e-4, heights[cur] - 1);
  if (d <= pin) return base + d / pin;
  return base + 1 + clamp(d - pin, 0, 1);
}

/** Reduced motion: one still per frame (f03 steps through the four roast stages). */
export function stillBeat(views: Record<FrameId, FrameView>): number {
  let best = -1;
  let idx = 0;
  for (let i = 0; i < 5; i += 1) {
    const v = views[ORDER[i]].visibility;
    if (v > best) {
      best = v;
      idx = i;
    }
  }
  switch (idx) {
    case 0:
      return 0;
    case 1:
      return 1.62;
    case 2: {
      const stage = Math.min(3, Math.floor(clamp(views.f03.progress) * 4));
      return 3 + [0.12, 0.42, 0.63, 0.9][stage];
    }
    case 3:
      return 5.45;
    default:
      return 7 + (CUPS.pulseAt + CUPS.pulseWidth + 0.005);
  }
}

/** Largest on-screen coverage among the five frames. */
export function maxVisibility(views: Record<FrameId, FrameView>) {
  let m = 0;
  for (const id of ORDER) m = Math.max(m, views[id].visibility);
  return m;
}

export function sumVisibility(views: Record<FrameId, FrameView>) {
  let s = 0;
  for (const id of ORDER) s += views[id].visibility;
  return s;
}
