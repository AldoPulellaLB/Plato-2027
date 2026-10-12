// Story state shared by the DOM chapters and the WebGL layer. Mutable, not React
// state: per-frame values are read inside rAF loops; React only subscribes to the
// low-frequency bits (active frame / chapter / theme) through useStory().
import { useSyncExternalStore } from "react";

import type { ChapterId } from "@/lib/site";

export type StoryTheme = "roast" | "paper" | "forest";

export type FrameId =
  | "f01" | "f02" | "f03" | "f04" | "f05" | "f06" | "f07"
  | "f08" | "f09" | "f10" | "f11" | "f12" | "f13" | "f14";

export interface FrameSpec {
  id: FrameId;
  chapter: ChapterId;
  /** Scroll length in viewport heights. */
  vh: number;
  /** Pinned frames hold a 100svh sticky stage while scroll drives the frame. */
  pinned: boolean;
  /** Theme applied when the frame reaches the middle of the viewport. */
  theme: StoryTheme;
  title: string;
}

/**
 * The storyboard (client brief): 14 frames, four chapters, ~2,470vh.
 * f06, f07 and f08 are rendered by the scroll-scrub film (one film leg each),
 * so their scroll lengths are set on the scenes in src/scroll-scrub-scenes.ts.
 */
export const FRAMES: FrameSpec[] = [
  { id: "f01", chapter: "bean", vh: 100, pinned: false, theme: "roast", title: "Cold open" },
  { id: "f02", chapter: "bean", vh: 150, pinned: true, theme: "roast", title: "Green beans fall into the roaster" },
  { id: "f03", chapter: "bean", vh: 250, pinned: true, theme: "roast", title: "The roast changes colour" },
  { id: "f04", chapter: "bean", vh: 150, pinned: true, theme: "roast", title: "First crack and the cooling tray" },
  { id: "f05", chapter: "pour", vh: 200, pinned: true, theme: "roast", title: "One taste, everywhere" },
  { id: "f06", chapter: "pour", vh: 200, pinned: true, theme: "roast", title: "The ristretto shot" },
  { id: "f07", chapter: "pour", vh: 200, pinned: true, theme: "roast", title: "The pour opens into light" },
  { id: "f08", chapter: "pour", vh: 150, pinned: true, theme: "paper", title: "The barista knows your name" },
  { id: "f09", chapter: "pour", vh: 250, pinned: false, theme: "paper", title: "Community included" },
  { id: "f10", chapter: "brand", vh: 150, pinned: true, theme: "paper", title: "The cup family" },
  { id: "f11", chapter: "brand", vh: 300, pinned: true, theme: "paper", title: "Same store, local twist" },
  { id: "f12", chapter: "brand", vh: 120, pinned: false, theme: "paper", title: "Take Platō home" },
  { id: "f13", chapter: "menu", vh: 250, pinned: true, theme: "forest", title: "The signature menu" },
  { id: "f14", chapter: "menu", vh: 100, pinned: false, theme: "paper", title: "Find your Platō" },
];

export const FRAME_IDS = FRAMES.map((f) => f.id);

type Progress = Record<FrameId, number>;

/** Live values. Read freely in rAF loops; never mutate outside this module's setters. */
export const story = {
  /** 0..1 per frame. Pinned: 0 when the frame top hits the viewport top, 1 when its bottom leaves. Unpinned: enter-bottom to leave-top. */
  progress: Object.fromEntries(FRAME_IDS.map((id) => [id, 0])) as Progress,
  /** 0..1 across the whole story (#story). */
  total: 0,
  /** Scroll velocity in px/s (signed), smoothed. */
  velocity: 0,
  /** Pointer in normalised device coords (-1..1). */
  pointer: { x: 0, y: 0 },
};

interface Snapshot {
  frame: FrameId | null;
  chapter: ChapterId | null;
  theme: StoryTheme;
}

let snapshot: Snapshot = { frame: null, chapter: null, theme: "roast" };
const listeners = new Set<() => void>();
const eventListeners = new Map<string, Set<(detail?: unknown) => void>>();

function emitChange() {
  for (const l of listeners) l();
}

export function setActiveFrame(frame: FrameId | null) {
  if (snapshot.frame === frame) return;
  const spec = FRAMES.find((f) => f.id === frame);
  snapshot = { ...snapshot, frame, chapter: spec?.chapter ?? null };
  emitChange();
}

export function setStoryTheme(theme: StoryTheme) {
  if (typeof document !== "undefined") document.documentElement.dataset.story = theme;
  if (snapshot.theme === theme) return;
  snapshot = { ...snapshot, theme };
  emitChange();
}

export function getStorySnapshot() {
  return snapshot;
}

export function subscribeStory(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_SNAPSHOT: Snapshot = { frame: null, chapter: null, theme: "roast" };

/** Low-frequency story state for React (active frame, chapter, theme). */
export function useStory(): Snapshot {
  return useSyncExternalStore(subscribeStory, getStorySnapshot, () => SERVER_SNAPSHOT);
}

/** One-off story events, e.g. "first-crack" (sound), "pour-white" (theme flip). */
export function emitStoryEvent(name: string, detail?: unknown) {
  for (const l of eventListeners.get(name) ?? []) l(detail);
}

export function onStoryEvent(name: string, listener: (detail?: unknown) => void) {
  const set = eventListeners.get(name) ?? new Set();
  set.add(listener);
  eventListeners.set(name, set);
  return () => set.delete(listener);
}

/** Reset live values when the home page unmounts (route change). */
export function resetStory() {
  for (const id of FRAME_IDS) story.progress[id] = 0;
  story.total = 0;
  story.velocity = 0;
  snapshot = { frame: null, chapter: null, theme: snapshot.theme };
  emitChange();
}

/* ------------------------------------------------------------------ */
/* Roast model (frame 03). Shared by the WebGL beans and the DOM labels. */

export const ROAST_STAGES = [
  { id: "drying", label: "Drying", note: "Green to pale yellow", from: 0, to: 0.28 },
  { id: "browning", label: "Browning", note: "Yellow to tan", from: 0.28, to: 0.56 },
  { id: "first-crack", label: "First crack", note: "An audible pop", from: 0.56, to: 0.72 },
  { id: "development", label: "Development", note: "Chestnut brown, then the tray", from: 0.72, to: 1 },
] as const;

/** f03 progress at which first crack happens (chaff flash, crackle sound, hard cut allowed). */
export const FIRST_CRACK_AT = 0.56;

/* ------------------------------------------------------------------ */
/* Shared timing between the DOM chapters and the WebGL layer.          */

/** f05 progress: the counter runs 1 to 150 over this window, and the WebGL
 *  cup grid fills over the same window (the last cup lands at `to`). */
export const CUP_COUNT_WINDOW = { from: 0.05, to: 0.62 } as const;

/** f07 progress: the white disc grows from `from`; at `cover` the screen is
 *  fully white and the theme flips to paper ("pour-white" fires). */
export const POUR_WHITE_WINDOW = { from: 0.56, cover: 0.72 } as const;

/** Bean temperature in °C for f03 progress (drop at 208°C, before second crack: medium roast). */
export function roastTemperature(p: number) {
  const x = Math.min(1, Math.max(0, p));
  const keys: [number, number][] = [
    [0, 96],
    [0.28, 160],
    [0.56, 196],
    [0.72, 202],
    [1, 208],
  ];
  for (let i = 1; i < keys.length; i += 1) {
    const [p1, t1] = keys[i];
    const [p0, t0] = keys[i - 1];
    if (x <= p1) return t0 + ((x - p0) / (p1 - p0)) * (t1 - t0);
  }
  return 208;
}

/** Roast colour ramp, linear sRGB 0..1: green bean -> pale yellow -> tan -> chestnut (matte medium roast). */
const RAMP: [number, [number, number, number]][] = [
  [0, [0.56, 0.63, 0.42]],
  [0.2, [0.74, 0.74, 0.5]],
  [0.36, [0.85, 0.78, 0.55]],
  [0.56, [0.72, 0.53, 0.35]],
  [0.72, [0.46, 0.29, 0.17]],
  [1, [0.35, 0.2, 0.12]],
];

export function roastColor(p: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, p));
  for (let i = 1; i < RAMP.length; i += 1) {
    const [p1, c1] = RAMP[i];
    const [p0, c0] = RAMP[i - 1];
    if (x <= p1) {
      const t = (x - p0) / (p1 - p0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return RAMP[RAMP.length - 1][1];
}

/* ------------------------------------------------------------------ */
/* Page background through the roast (frame 03). As the bean temperature
 * climbs, the chapter-one background moves from roast olive to a roasted
 * brown, and back when scrolling up. The DOM (--plato-roast on <html>) and
 * the WebGL fog/grade both read these, so the 3D edges always match the page. */

/** sRGB 0..255. Start: the brand roast olive (#121600). End: roasted brown (#100d08). */
export const ROAST_BG_FROM: readonly [number, number, number] = [18, 22, 0];
export const ROAST_BG_TO: readonly [number, number, number] = [16, 13, 8];
/** The lighter companion shade (--plato-roast-2) for each end. */
const ROAST_BG2_FROM: readonly [number, number, number] = [27, 31, 8];
const ROAST_BG2_TO: readonly [number, number, number] = [25, 22, 16];

const T_MIN = roastTemperature(0);
const T_MAX = roastTemperature(1);

/** 0..1 blend toward the roasted brown for f03 progress, following the temperature. */
export function roastBackgroundMix(p: number) {
  return Math.min(1, Math.max(0, (roastTemperature(p) - T_MIN) / (T_MAX - T_MIN)));
}

function mixInto(a: readonly number[], b: readonly number[], t: number, out: number[]) {
  out[0] = Math.round(a[0] + (b[0] - a[0]) * t);
  out[1] = Math.round(a[1] + (b[1] - a[1]) * t);
  out[2] = Math.round(a[2] + (b[2] - a[2]) * t);
  return out;
}

/** Page background (sRGB 0..255) for f03 progress. Pass `out` to avoid allocating per frame. */
export function roastBackground(p: number, out: number[] = [0, 0, 0]) {
  return mixInto(ROAST_BG_FROM, ROAST_BG_TO, roastBackgroundMix(p), out);
}

/** Companion shade (sRGB 0..255) for f03 progress. */
export function roastBackground2(p: number, out: number[] = [0, 0, 0]) {
  return mixInto(ROAST_BG2_FROM, ROAST_BG2_TO, roastBackgroundMix(p), out);
}
