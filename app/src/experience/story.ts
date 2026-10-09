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
  { id: "f09", chapter: "pour", vh: 150, pinned: false, theme: "paper", title: "Community included" },
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
