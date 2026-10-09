// SoundToggle: bottom-left, off on every load. The beds belong to the story:
// roaster hum through the bean chapter and the shot, café murmur from the pour
// on, one procedural crackle at first crack. The toggle only exists while the
// story is on screen; anywhere else it steps away and the audio sleeps (the
// visitor's choice is kept for when they return). Audio only ever starts from a
// click on the toggle itself.
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { onStoryEvent, useStory } from "@/experience/story";
import { ui, useUi } from "@/lib/ui";

import { ambient } from "./audio";
import type { Bed } from "./audio";
import { frameIndex, useChrome, useFooterInView, usePathname } from "./shared";
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
  const { storyOnScreen, inkTone } = useChrome();
  const pathname = usePathname();
  const footerInView = useFooterInView();

  const isHome = pathname === "/";
  const inStory = isHome && storyOnScreen;
  const bed: Bed = isHome && frameIndex(frame) < POUR_INDEX ? "roaster" : "cafe";

  useEffect(() => {
    ambient().setEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    ambient().setBed(bed);
  }, [bed]);

  // Outside the story: fade out and sleep, without touching the saved choice.
  useEffect(() => {
    ambient().setSuspended(!inStory);
  }, [inStory]);

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
      // Create and resume the context inside the click itself (the opt-in gesture).
      ambient().setEnabled(true);
      ambient().unlock();
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
      aria-pressed={soundOn}
      className="snd"
      data-hidden={hidden ? "true" : "false"}
      data-on={soundOn ? "true" : "false"}
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
