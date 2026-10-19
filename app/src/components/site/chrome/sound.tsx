// SoundToggle: bottom-left, on by default (a visitor who turns it off stays off
// on later loads). The ambience belongs to the story: the roastery track all the
// way through, and one procedural crackle at first crack. The toggle only exists while the story is on screen; anywhere else
// it steps away and the audio sleeps (the visitor's choice is kept for when they
// return). Browsers only allow audio after a gesture, so it starts with the first
// click, tap or key press anywhere (scrolling does not count).
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { onStoryEvent } from "@/experience/story";
import { ui, useUi } from "@/lib/ui";

import { ambient, useAudioStarted } from "./audio";
import { useChrome, useFooterInView, usePathname } from "./shared";
import "./sound.css";

const BARS = [
  { d: "760ms", lo: 0.3, delay: "0ms" },
  { d: "980ms", lo: 0.45, delay: "-240ms" },
  { d: "640ms", lo: 0.22, delay: "-420ms" },
  { d: "880ms", lo: 0.38, delay: "-120ms" },
];

/** localStorage: "off" once the visitor has turned sound off. */
const SOUND_KEY = "plato.sound";
/** Events that count as a gesture for starting audio (the HTML user-activation list). */
const GESTURES = ["pointerdown", "pointerup", "touchend", "keydown", "click"] as const;

export function SoundToggle() {
  const { soundOn, ready, menuOpen } = useUi();
  const { storyOnScreen, inkTone } = useChrome();
  const pathname = usePathname();
  const footerInView = useFooterInView();

  const started = useAudioStarted();

  const isHome = pathname === "/";
  const inStory = isHome && storyOnScreen;
  // What the visitor hears: on, and the browser has let it start.
  const playing = soundOn && started;

  // A visitor who turned sound off keeps it off.
  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === "off") ui.setSound(false);
    } catch {
      // Storage blocked: the default stands.
    }
  }, []);

  useEffect(() => {
    ambient().setEnabled(soundOn);
  }, [soundOn]);

  // On by default: start the audio with the first gesture anywhere. The toggle's
  // own click is left to the toggle, so turning it off never blips the sound.
  useEffect(() => {
    if (!soundOn || ambient().isStarted()) return;
    const unlock = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".snd")) return;
      ambient().unlock();
      if (ambient().isStarted()) stop();
    };
    const stop = () => {
      for (const type of GESTURES) window.removeEventListener(type, unlock, true);
    };
    for (const type of GESTURES) window.addEventListener(type, unlock, { capture: true, passive: true });
    return stop;
  }, [soundOn, started]);

  // Outside the story, and under the loader (the films have the bandwidth): fade
  // out and sleep, without touching the saved choice.
  useEffect(() => {
    ambient().setSuspended(!ready || !inStory);
  }, [ready, inStory]);

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
    // On by default but not started yet (no gesture so far): this click starts it.
    if (soundOn && !started) {
      ambient().setEnabled(true);
      ambient().unlock();
      return;
    }
    const next = !soundOn;
    if (next) {
      // Create and resume the context inside the click itself (the gesture).
      ambient().setEnabled(true);
      ambient().unlock();
    }
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // Storage blocked: the choice lasts for this visit only.
    }
    ui.setSound(next);
  };

  // Off the story (other pages, the home sections after it) it is gone for
  // pointer, keyboard and assistive tech alike.
  const away = !ready || !inStory;
  const hidden = away || footerInView || menuOpen;

  return (
    <button
      aria-label="Sound"
      aria-pressed={playing}
      className="snd"
      data-hidden={hidden ? "true" : "false"}
      data-on={playing ? "true" : "false"}
      data-tone={inkTone ? "ink" : "theme"}
      inert={away}
      onClick={toggle}
      tabIndex={away ? -1 : undefined}
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
