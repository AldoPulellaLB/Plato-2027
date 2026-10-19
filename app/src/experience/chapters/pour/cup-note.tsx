// Frame 08's payoff: once the barista has turned the cup to its blank back, a
// handwritten note writes itself onto the paper, scrubbed with the scroll. One of
// five notes, a different one on every visit. It lives inside the film's own f08
// layer (so it fades with the film) and is pinned to the cup's blank patch in the
// video, wherever object-fit: cover puts the frame on this screen.
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import { story } from "@/experience/story";
import { scrollScrubScenes } from "@/scroll-scrub-scenes";
import { ensureGsap, prefersReducedMotion } from "@/lib/motion/smooth";

import { range, tickWhileNear } from "../shared/motion";

type Mark = "smile" | "heart" | "sun";

/** The five notes; the visit cycles through them (localStorage), so each load writes a new one. */
const NOTES: { name: string; mark: Mark }[] = [
  { name: "Bongile", mark: "smile" },
  { name: "Thabo", mark: "sun" },
  { name: "Naledi", mark: "heart" },
  { name: "Liam", mark: "smile" },
  { name: "Zinhle", mark: "sun" },
];
const NOTE_KEY = "plato.cupnote";
const LINES = ["Make every", "day count."];
// Written in lower case (as text, not only styled).

/**
 * The cup's blank patch in the final (held) frames, as fractions of the video frame
 * (both clips are 16:9, the same picture): left, top, width, height, and the tilt
 * the writing takes on the curved paper.
 */
const PATCH = { x: 0.352, y: 0.485, w: 0.15, h: 0.27, tilt: -3 };
/** The clip plays over this share of f08's scroll; its last frame holds for the rest. */
const PLAYED = 1 - (scrollScrubScenes[2]?.hold ?? 0);
/** f08 progress over which the note writes itself (the name, the two lines, then the
 * mark): from frame 184 of 231, when the cup has settled, to the clip's last frame. */
const WRITE_FROM = (184 / 231) * PLAYED;
// A hair short of the end: the engine never seeks past 99.9% of the clip.
const WRITE_TO = 0.995 * PLAYED;

/** Every character the notes use (written in lower case), so Google Fonts serves a tiny Lacquer subset. */
const GLYPHS = Array.from(new Set([...NOTES.map((n) => n.name), ...LINES].join("").toLowerCase())).join("");

function useLacquer() {
  useEffect(() => {
    const id = "plato-lacquer";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=Lacquer&display=swap&text=${encodeURIComponent(GLYPHS)}`;
    document.head.append(link);
  }, []);
}

/** This page load's note: picked once, so re-renders and remounts keep the same one. */
let chosen: (typeof NOTES)[number] | null = null;

function pickNote() {
  if (chosen) return chosen;
  let next = Math.floor(Math.random() * NOTES.length);
  try {
    const last = Number.parseInt(localStorage.getItem(NOTE_KEY) ?? "", 10);
    if (Number.isFinite(last)) next = (last + 1) % NOTES.length;
    localStorage.setItem(NOTE_KEY, String(next));
  } catch {
    // Storage blocked: a random note each visit.
  }
  chosen = NOTES[next];
  return chosen;
}

/** Hand-drawn marks in the marker's stroke (pathLength 1, so they draw on with the scroll). */
function MarkSvg({ mark }: { mark: Mark }) {
  return (
    <svg aria-hidden="true" className="cup-note__mark" fill="none" viewBox="0 0 64 64">
      {mark === "smile" ? (
        <>
          <path d="M33 6c-14-1-26 9-27 24-1 15 11 28 26 28 14 0 26-11 26-26C58 18 48 7 35 6" pathLength={1} />
          <path d="M24 25v5" pathLength={1} />
          <path d="M40 24v5" pathLength={1} />
          <path d="M19 38c4 7 10 10 15 9 6 0 10-4 12-9" pathLength={1} />
        </>
      ) : mark === "heart" ? (
        <path
          d="M32 56C21 47 7 37 7 23c0-8 6-14 13-14 6 0 10 4 12 9 2-6 7-10 13-10 7 0 13 6 12 15-1 14-15 24-25 33"
          pathLength={1}
        />
      ) : (
        <>
          <path d="M32 21c-6 0-11 5-11 11s5 11 11 11 11-5 11-11-5-12-12-11" pathLength={1} />
          <path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M52 12l-6 6M18 46l-6 6" pathLength={1} />
        </>
      )}
    </svg>
  );
}

/** Where the video frame sits in its layer under object-fit: cover and this screen's object-position. */
function frameRect(layer: HTMLElement) {
  const media = layer.querySelector<HTMLElement>(".scroll-scrub__video, .scroll-scrub__poster");
  const cw = layer.clientWidth;
  const ch = layer.clientHeight;
  const aspect = 16 / 9;
  const w = Math.max(cw, ch * aspect);
  const h = w / aspect;
  const [px, py] = (media ? getComputedStyle(media).objectPosition : "50% 50%").split(" ").map((v, i) => {
    if (v.endsWith("%")) return Number.parseFloat(v) / 100;
    const free = i === 0 ? cw - w : ch - h;
    return free ? Number.parseFloat(v) / free : 0.5;
  });
  return { x: (cw - w) * (px ?? 0.5), y: (ch - h) * (py ?? 0.5), w, h };
}

export function CupNote({ root }: { root: HTMLElement | null }) {
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const note = useMemo(() => (typeof window === "undefined" ? NOTES[0] : pickNote()), []);
  useLacquer();

  // The f08 layer is the film's third segment.
  useEffect(() => {
    if (!root || prefersReducedMotion()) return;
    setLayer(root.querySelectorAll<HTMLElement>("[data-scroll-scrub-layer]")[2] ?? null);
  }, [root]);

  // Pin the note to the cup's blank patch, on every resize.
  useEffect(() => {
    const el = noteRef.current;
    if (!layer || !el) return;
    const place = () => {
      const f = frameRect(layer);
      el.style.left = `${(f.x + PATCH.x * f.w).toFixed(1)}px`;
      el.style.top = `${(f.y + PATCH.y * f.h).toFixed(1)}px`;
      el.style.width = `${(PATCH.w * f.w).toFixed(1)}px`;
      el.style.height = `${(PATCH.h * f.h).toFixed(1)}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(layer);
    return () => ro.disconnect();
  }, [layer]);

  // Write it on with the scroll: name, then each line, then the mark (and back off on the way up).
  useEffect(() => {
    const el = noteRef.current;
    if (!layer || !el) return;
    const { gsap, ScrollTrigger } = ensureGsap();
    const steps = ["--w0", "--w1", "--w2", "--w3"];
    const update = () => {
      // Follow the film, not only the scroll: if the clip arrives late it catches up
      // through the turn, and the note waits for the cup to get there.
      const video = layer.querySelector<HTMLVideoElement>("video");
      const filmAt = video?.duration ? (video.currentTime / video.duration) * PLAYED : 0;
      const p = range(Math.min(story.progress.f08, filmAt), WRITE_FROM, WRITE_TO);
      steps.forEach((name, i) => el.style.setProperty(name, range(p, i / steps.length, (i + 1) / steps.length).toFixed(4)));
    };
    const section = layer.closest("section") ?? layer;
    return tickWhileNear(ScrollTrigger, gsap, section, update, "0%");
  }, [layer]);

  if (!layer) return null;
  return createPortal(
    <div aria-hidden="true" className="cup-note" ref={noteRef} style={{ "--tilt": `${PATCH.tilt}deg` } as CSSProperties}>
      <span className="cup-note__line" style={{ "--w": "var(--w0)" } as CSSProperties}>
        {note.name.toLowerCase()}
      </span>
      <span className="cup-note__gap" />
      {LINES.map((line, i) => (
        <span className="cup-note__line" key={line} style={{ "--w": `var(--w${i + 1})` } as CSSProperties}>
          {line.toLowerCase()}
        </span>
      ))}
      <span className="cup-note__line cup-note__line--mark" style={{ "--w": "var(--w3)" } as CSSProperties}>
        <MarkSvg mark={note.mark} />
      </span>
    </div>,
    layer,
  );
}
