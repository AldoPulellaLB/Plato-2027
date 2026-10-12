// Chapter one: the bean (frames 01 to 04). Dark, slow and close up. The WebGL
// layer carries the beans, the drum and the cooling tray; this file owns the
// copy over it, positioned to keep the GL subjects clear.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline } from "@/components/site/text/reveal";
import { Frame } from "@/experience/frame";
import {
  FIRST_CRACK_AT,
  ROAST_STAGES,
  emitStoryEvent,
  roastBackground,
  roastBackground2,
  roastColor,
  roastTemperature,
  story,
} from "@/experience/story";
import { ensureGsap } from "@/lib/motion/smooth";
import { useUi } from "@/lib/ui";

import { ChapterLabel, ScrollCue } from "../shared/parts";
import {
  linearToCss,
  range,
  revealOn,
  setText,
  tickWhileNear,
  useScrollScene,
} from "../shared/motion";
import "./bean.css";

export function BeanChapter() {
  return (
    <div className="ch-chapter ch-bean" data-chapter="bean" id="bean">
      <div aria-hidden="true" className="ch-grain">
        <div className="ch-grain__sticky">
          <div className="plato-grain" />
        </div>
      </div>
      <ColdOpen />
      <BeansFall />
      <Roast />
      <CoolingTray />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 01: cold open                                                 */

function ColdOpen() {
  const { ready, soundOn } = useUi();
  const [fallback, setFallback] = useState(false);
  const play = ready || fallback;
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const footRef = useRef<HTMLDivElement>(null);

  // The preloader hands over through ui.ready; never wait more than 2.5s.
  useEffect(() => {
    const id = window.setTimeout(() => setFallback(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  // Intro: label and foot follow the ghost headline once the curtain lifts.
  useEffect(() => {
    const els = [rootRef.current, labelRef.current].filter(Boolean) as HTMLElement[];
    if (!els.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const el of els) el.dataset.armed = "";
    if (play) {
      const id = window.requestAnimationFrame(() => els.forEach((el) => (el.dataset.in = "")));
      return () => window.cancelAnimationFrame(id);
    }
    for (const el of els) delete el.dataset.in;
  }, [play]);

  // Exit: the headline lifts away 1.4x faster than the background and blurs out.
  useScrollScene(rootRef, ({ el, gsap, reduced }) => {
    if (reduced) return;
    const frame = el.closest("section") ?? el;
    const st = { trigger: frame, start: "top top", end: "bottom top", scrub: true } as const;
    gsap.fromTo(
      titleRef.current,
      { yPercent: 0, y: 0, filter: "blur(0px)", opacity: 1 },
      {
        y: () => -0.4 * window.innerHeight,
        filter: "blur(14px)",
        opacity: 0,
        ease: "none",
        scrollTrigger: { ...st, invalidateOnRefresh: true },
      },
    );
    gsap.fromTo(
      labelRef.current,
      { y: 0, opacity: 1 },
      {
        y: () => -0.3 * window.innerHeight,
        opacity: 0,
        ease: "none",
        scrollTrigger: { ...st, end: "60% top", invalidateOnRefresh: true },
      },
    );
    gsap.fromTo(
      footRef.current,
      { opacity: 1, y: 0 },
      { opacity: 0, y: -24, ease: "none", scrollTrigger: { ...st, end: "22% top" } },
    );
    // The soft floor behind the foot row fades with it, a touch longer so it melts away.
    gsap.fromTo(
      el,
      { "--ch-floor": 1 },
      { "--ch-floor": 0, ease: "none", scrollTrigger: { ...st, end: "30% top" } },
    );
  });

  return (
    <Frame className="ch-frame ch-f01" id="f01" stageClassName="ch-stage ch-f01__stage">
      <div className="ch-f01__inner" ref={rootRef}>
        <div className="ch-f01__head">
          <ChapterLabel chapter="bean" className="ch-f01__label" ref={labelRef} />
          <div className="ch-f01__title-wrap" ref={titleRef}>
            <GhostHeadline as="h1" className="t-display ch-f01__title" play={play} trigger="manual">
              Every cup begins the same way.
            </GhostHeadline>
          </div>
        </div>
        <div className="ch-f01__foot" ref={footRef}>
          <div className="ch-f01__foot-in">
            <p className="ch-sound-hint t-label" data-on={soundOn ? "" : undefined}>
              <span aria-hidden="true" className="ch-sound-hint__bars">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span className="ch-sound-hint__text">
                {soundOn ? "Sound on: the roastery" : "Best with sound on"}
              </span>
              {soundOn ? null : (
                <svg
                  aria-hidden="true"
                  className="ch-sound-hint__arrow"
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M12 4 4 12M4 6v6h6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.3"
                  />
                </svg>
              )}
            </p>
            <ScrollCue className="ch-f01__cue" target="f02" />
            <p className="ch-f01__aside t-label">From the roast to the regular</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 02: green beans fall into the roaster                         */

const ORIGINS = ["Tanzania.", "Guatemala.", "Brazil."];

function BeansFall() {
  const ref = useRef<HTMLDivElement>(null);

  useScrollScene(ref, ({ el, gsap, reduced }) => {
    if (reduced) return;
    const frame = el.closest("section")!;
    const items = el.querySelectorAll<HTMLElement>(".ch-origin");
    const caption = el.querySelector(".ch-f02__caption");

    // The three origins arrive one at a time across the approach and the pin.
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: frame, start: "top 55%", end: "bottom bottom", scrub: true },
    });
    items.forEach((item, i) => {
      const at = 0.06 + i * 0.24;
      tl.fromTo(
        item,
        { opacity: 0, y: 46, filter: "blur(12px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.16, ease: "power2.out" },
        at,
      );
      // The previous origin steps back while the next one arrives.
      if (i < items.length - 1) tl.to(item, { opacity: 0.38, duration: 0.1 }, at + 0.24);
    });
    tl.to(items, { opacity: 1, duration: 0.08 }, 0.86);
    tl.fromTo(caption, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.1 }, 0.82);
    tl.to({}, { duration: 0.06 }, 0.94);

    // Exit: the camera pushes into the hopper; the copy lifts away first.
    gsap.to(el, {
      y: () => -0.16 * window.innerHeight,
      opacity: 0,
      filter: "blur(8px)",
      ease: "none",
      scrollTrigger: {
        trigger: frame,
        start: "bottom bottom",
        end: "bottom 55%",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  });

  return (
    <Frame className="ch-frame ch-f02" id="f02" stageClassName="ch-stage ch-f02__stage">
      <div className="ch-f02__col" ref={ref}>
        <ol className="ch-origins" aria-label="Tanzania. Guatemala. Brazil.">
          {ORIGINS.map((name, i) => (
            <li className="ch-origin" key={name}>
              <span aria-hidden="true" className="ch-origin__n t-num">
                0{i + 1}
              </span>
              <span className="ch-origin__name">{name}</span>
            </li>
          ))}
        </ol>
        <p className="ch-f02__caption">
          Green coffee from three origins, blended into one House Blend.
        </p>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 03: the roast changes colour                                  */

function Roast() {
  const ref = useRef<HTMLDivElement>(null);

  // The page background roasts with the beans: olive at the start of f03,
  // roasted brown as the temperature climbs, back to olive when scrolling up.
  // Written to the brand variable on <html>, so the page, scrims and film stage
  // all follow. Runs under reduced motion too (it is colour, not movement).
  useEffect(() => {
    const frame = ref.current?.closest("section");
    if (!frame) return;
    const { ScrollTrigger } = ensureGsap();
    const root = document.documentElement;
    const bg = [0, 0, 0];
    const bg2 = [0, 0, 0];
    let last = "";
    const apply = (p: number) => {
      roastBackground(p, bg);
      const key = bg.join(",");
      if (key === last) return;
      last = key;
      roastBackground2(p, bg2);
      root.style.setProperty("--plato-roast", `rgb(${bg[0]} ${bg[1]} ${bg[2]})`);
      root.style.setProperty("--plato-roast-2", `rgb(${bg2[0]} ${bg2[1]} ${bg2[2]})`);
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = ScrollTrigger.create({
      trigger: frame,
      start: reduced ? "top 60%" : "top top",
      end: reduced ? "bottom 40%" : "bottom bottom",
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });
    apply(st.progress);
    return () => {
      st.kill();
      root.style.removeProperty("--plato-roast");
      root.style.removeProperty("--plato-roast-2");
    };
  }, []);

  useScrollScene(ref, ({ el, gsap, ScrollTrigger, reduced, isMobile }) => {
    if (reduced) return;
    const frame = el.closest("section")!;
    const temp = el.querySelector<HTMLElement>("[data-temp]");
    const stageName = el.querySelector<HTMLElement>("[data-stage-name]");
    const rows = Array.from(el.querySelectorAll<HTMLElement>(".ch-stage-row"));
    const fills = rows.map((r) => r.querySelector<HTMLElement>(".ch-stage-row__fill"));
    const meter = el.querySelector<HTMLElement>(".ch-roast__meter-fill");
    let lastP = story.progress.f03;
    let armed = lastP < FIRST_CRACK_AT;
    let lastStage = -1;
    let lastColour = "";
    let crackTimer = 0;

    const update = () => {
      const p = story.progress.f03;
      setText(temp, String(Math.round(roastTemperature(p))));

      let idx = 0;
      ROAST_STAGES.forEach((s, i) => {
        if (p >= s.from) idx = i;
        const local = range(p, s.from, s.to);
        const fill = fills[i];
        if (fill) fill.style.transform = `scaleX(${local.toFixed(4)})`;
      });
      if (idx !== lastStage) {
        lastStage = idx;
        rows.forEach(
          (row, i) => (row.dataset.state = i < idx ? "done" : i === idx ? "active" : "next"),
        );
        setText(stageName, ROAST_STAGES[idx].label);
      }
      if (meter) meter.style.transform = `scaleY(${p.toFixed(4)})`;

      const colour = linearToCss(roastColor(p));
      if (colour !== lastColour) {
        lastColour = colour;
        el.style.setProperty("--ch-roast", colour);
      }

      // First crack: emit once going forward, re-arm when scrolled back above.
      if (armed && lastP < FIRST_CRACK_AT && p >= FIRST_CRACK_AT) {
        armed = false;
        emitStoryEvent("first-crack", { progress: p });
        el.dataset.crack = "";
        window.clearTimeout(crackTimer);
        crackTimer = window.setTimeout(() => delete el.dataset.crack, 1100);
      } else if (!armed && p < FIRST_CRACK_AT - 0.015) {
        armed = true;
      }
      lastP = p;
    };

    const stopTick = tickWhileNear(ScrollTrigger, gsap, frame, update, "40%");

    // Copy arrives with the frame, and leaves before the cut to the tray.
    const parts = el.querySelectorAll(".ch-f03__title, .ch-roast__body");
    gsap.fromTo(
      parts,
      { opacity: 0, y: isMobile ? 30 : 48, filter: "blur(10px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: frame, start: "top 70%", end: "top 5%", scrub: true },
      },
    );
    gsap.to(el, {
      y: () => -0.16 * window.innerHeight,
      opacity: 0,
      filter: "blur(8px)",
      ease: "none",
      scrollTrigger: {
        trigger: frame,
        start: "bottom bottom",
        end: "bottom 55%",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      stopTick();
      window.clearTimeout(crackTimer);
      delete el.dataset.crack;
    };
  });

  return (
    <Frame className="ch-frame ch-f03" id="f03" stageClassName="ch-stage ch-f03__stage">
      <div className="ch-f03__inner" ref={ref}>
        <div className="ch-f03__title">
          <h2 className="ch-f03__h">The roast changes colour.</h2>
        </div>

        <div className="ch-roast">
          <div className="ch-roast__body">
            <div className="ch-roast__readout">
              <p className="ch-roast__temp" aria-hidden="true">
                <span className="t-num" data-temp>
                  96
                </span>
                <span className="ch-roast__unit">°C</span>
              </p>
              <p className="ch-roast__range t-num">96°C to a 208°C drop</p>
              <div className="ch-roast__meta">
                <span aria-hidden="true" className="ch-roast__swatch" />
                <span className="t-label">
                  Bean temperature
                  <span className="ch-roast__now" aria-hidden="true">
                    {" "}
                    · <span data-stage-name>Drying</span>
                  </span>
                </span>
              </div>
            </div>
            <ol className="ch-stages" aria-label="Roast stages">
              {ROAST_STAGES.map((s, i) => (
                <li className="ch-stage-row" data-state={i === 0 ? "active" : "next"} key={s.id}>
                  <span className="ch-stage-row__n t-num" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <span className="ch-stage-row__body">
                    <span className="ch-stage-row__label">{s.label}</span>
                    <span className="ch-stage-row__note">{s.note}</span>
                  </span>
                  <span aria-hidden="true" className="ch-stage-row__bar">
                    <span className="ch-stage-row__fill" />
                  </span>
                </li>
              ))}
            </ol>
            <span aria-hidden="true" className="ch-roast__meter">
              <span className="ch-roast__meter-fill" />
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 04: first crack and the cooling tray                          */

function CoolingTray() {
  const ref = useRef<HTMLDivElement>(null);

  useScrollScene(ref, ({ el, gsap, ScrollTrigger, reduced }) => {
    if (reduced) return;
    const frame = el.closest("section")!;
    // The headline slides in from the left as the frame pins.
    const stopReveal = revealOn(ScrollTrigger, [el], frame, "top 18%");
    gsap.to(el, {
      y: () => -0.16 * window.innerHeight,
      opacity: 0,
      filter: "blur(8px)",
      ease: "none",
      scrollTrigger: {
        trigger: frame,
        start: "bottom bottom",
        end: "bottom 55%",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    return stopReveal;
  });

  return (
    <Frame className="ch-frame ch-f04" id="f04" stageClassName="ch-stage ch-f04__stage">
      <div className="ch-f04__copy" ref={ref}>
        <p className="ch-f04__kicker t-label">
          <span className="ch-f04__line" style={{ "--i": 0 } as CSSProperties}>
            <span className="ch-f04__in">Roasted at Blank</span>
          </span>
        </p>
        <h2 className="t-statement ch-f04__h">
          <span className="ch-f04__line" style={{ "--i": 1 } as CSSProperties}>
            <span className="ch-f04__in">Roasted by our </span>
          </span>
          <span className="ch-f04__line" style={{ "--i": 2 } as CSSProperties}>
            <span className="ch-f04__in">own roastery.</span>
          </span>
        </h2>
        <p className="ch-f04__detail">
          <span className="ch-f04__line" style={{ "--i": 3 } as CSSProperties}>
            <span className="ch-f04__in">
              <span className="ch-f04__rule" aria-hidden="true" />
              Medium roast. 100% Arabica.
            </span>
          </span>
        </p>
      </div>
    </Frame>
  );
}
