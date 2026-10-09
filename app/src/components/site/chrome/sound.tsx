// SoundToggle: bottom-left, off by default. Roaster hum through the bean chapter
// and the shot, café murmur from the pour onward and on every other page, one
// procedural crackle at first crack. Never starts without the visitor's opt-in.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { onStoryEvent, useStory } from "@/experience/story";
import { ui, useUi } from "@/lib/ui";

import { ambient } from "./audio";
import type { Bed } from "./audio";
import {
  SOUND_KEY,
  frameIndex,
  readSession,
  useFooterInView,
  usePathname,
  writeSession,
} from "./shared";
import "./sound.css";

const BARS = [
  { d: "760ms", lo: 0.3, delay: "0ms" },
  { d: "980ms", lo: 0.45, delay: "-240ms" },
  { d: "640ms", lo: 0.22, delay: "-420ms" },
  { d: "880ms", lo: 0.38, delay: "-120ms" },
];

const POUR_INDEX = frameIndex("f07");

export function SoundToggle() {
  const { soundOn, ready, menuOpen } = useUi();
  const { frame } = useStory();
  const pathname = usePathname();
  const footerInView = useFooterInView();
  const firstRun = useRef(true);

  const isHome = pathname === "/";
  const bed: Bed = isHome && frameIndex(frame) < POUR_INDEX ? "roaster" : "cafe";

  // Restore this session's choice (it resumes on the next tap or key press).
  useEffect(() => {
    if (readSession(SOUND_KEY) === "1") ui.setSound(true);
  }, []);

  useEffect(() => {
    ambient().setEnabled(soundOn);
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    writeSession(SOUND_KEY, soundOn ? "1" : "0");
  }, [soundOn]);

  useEffect(() => {
    ambient().setBed(bed);
  }, [bed]);

  // Browsers only start audio after a gesture; wake the engine on the next one.
  useEffect(() => {
    if (!soundOn) return;
    const wake = () => ambient().unlock();
    window.addEventListener("pointerdown", wake, { once: true });
    window.addEventListener("keydown", wake, { once: true });
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [soundOn]);

  // Silence when the tab is hidden.
  useEffect(() => {
    const sync = () => ambient().setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    const off = onStoryEvent("first-crack", () => ambient().crackle());
    return () => {
      off();
    };
  }, []);

  const toggle = () => {
    const next = !soundOn;
    if (next) {
      // Create and resume the context inside the click itself.
      ambient().setEnabled(true);
      ambient().unlock();
    }
    ui.setSound(next);
  };

  const hidden = !ready || footerInView || menuOpen;

  return (
    <button
      aria-label="Sound"
      aria-pressed={soundOn}
      className="snd"
      data-hidden={hidden ? "true" : "false"}
      data-on={soundOn ? "true" : "false"}
      onClick={toggle}
      tabIndex={ready ? undefined : -1}
      type="button"
    >
      <span aria-hidden="true" className="snd-eq">
        {BARS.map((b, i) => (
          <i key={i} style={{ "--d": b.d, "--lo": b.lo, "--delay": b.delay } as CSSProperties} />
        ))}
      </span>
      <span aria-hidden="true" className="snd-text">
        <span className="snd-label">Sound</span>
        <span className="snd-state">
          <span className="snd-state__roll">
            <span>Off</span>
            <span>On</span>
          </span>
        </span>
      </span>
    </button>
  );
}
