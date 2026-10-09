// Chapter two: the pour (frames 05 to 09). The cup grid (WebGL), the scroll-
// scrubbed film (ristretto, milk, the white-out, the counter) and the
// community parallax. The only theme flip of the story happens here, at the
// exact moment the white of the milk covers the screen.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { ScrollScrub } from "@/components/scroll-scrub/scroll-scrub";
import { GhostHeadline } from "@/components/site/text/reveal";
import { Frame } from "@/experience/frame";
import { CUP_COUNT_WINDOW, POUR_WHITE_WINDOW, emitStoryEvent, setActiveFrame, setStoryTheme, story } from "@/experience/story";
import type { FrameId } from "@/experience/story";
import { ensureGsap, prefersReducedMotion } from "@/lib/motion/smooth";
import { TESTIMONIALS } from "@/lib/site";
import { scrollScrubScenes, scrollScrubTheme } from "@/scroll-scrub-scenes";

import { ChapterLabel } from "../shared/parts";
import {
  easeInOutCubic,
  range,
  revealOn,
  setText,
  tickWhileNear,
  useScrollScene,
} from "../shared/motion";
import "./pour.css";

export function PourChapter() {
  return (
    <div className="ch-chapter ch-pour" data-chapter="pour" id="pour">
      <OneTaste />
      <PourFilm />
      <Community />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 05: one taste, everywhere                                     */

/** Counter timing (shared with the cup grid fill): 1 at 5%, 150 at 62%. */
const COUNT_FROM = CUP_COUNT_WINDOW.from;
const COUNT_TO = CUP_COUNT_WINDOW.to;

function OneTaste() {
  const ref = useRef<HTMLDivElement>(null);

  useScrollScene(ref, ({ el, gsap, ScrollTrigger, reduced }) => {
    const num = el.querySelector<HTMLElement>("[data-count]");
    const zeros = el.querySelector<HTMLElement>("[data-zeros]");
    const count = el.querySelector<HTMLElement>(".ch-f05__count");
    const frame = el.closest("section")!;
    const scrim = frame.querySelector<HTMLElement>(".ch-f05__scrim");
    const label = el.querySelector<HTMLElement>(".ch-label");
    const title = el.querySelector<HTMLElement>(".ch-f05__title");
    if (reduced) {
      setText(zeros, "");
      setText(num, "150");
      return;
    }

    const stopReveal = revealOn(ScrollTrigger, [label, title], frame, "top 62%");
    let full = false;
    const update = () => {
      const p = story.progress.f05;
      const n = Math.round(1 + 149 * range(p, COUNT_FROM, COUNT_TO));
      setText(zeros, n < 10 ? "00" : n < 100 ? "0" : "");
      setText(num, String(n));
      if (n === 150 && !full) {
        full = true;
        count!.dataset.full = "";
      } else if (n < 150 && full) {
        full = false;
        delete count!.dataset.full;
      }
      // The dive into the centre cup: the copy clears first, the screen goes to coffee.
      const out = easeInOutCubic(range(p, 0.7, 0.84));
      el.style.opacity = String(1 - out);
      el.style.transform = `translate3d(0, ${(-out * 6).toFixed(2)}svh, 0) scale(${(1 + out * 0.06).toFixed(4)})`;
      if (scrim) scrim.style.opacity = String(1 - range(p, 0.74, 0.9));
    };
    const stopTick = tickWhileNear(ScrollTrigger, gsap, frame, update, "30%");
    return () => {
      stopTick();
      stopReveal();
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
      scrim?.style.removeProperty("opacity");
    };
  });

  return (
    <Frame className="ch-frame ch-f05" id="f05" stageClassName="ch-stage ch-f05__stage">
      <div aria-hidden="true" className="ch-f05__grain">
        <div className="plato-grain" />
      </div>
      <div aria-hidden="true" className="ch-f05__scrim" />
      <div className="ch-f05__inner" ref={ref}>
        <ChapterLabel chapter="pour" className="ch-f05__label" />
        <div className="ch-f05__copy">
          <h2 className="t-statement ch-f05__title">
            <span className="ch-f05__line">
              <span className="ch-f05__in">One taste.</span>
            </span>{" "}
            <span className="ch-f05__line">
              <span className="ch-f05__in" style={{ "--d": "90ms" } as CSSProperties}>
                150 stores.
              </span>
            </span>
          </h2>
          <div aria-hidden="true" className="ch-f05__count">
            <span className="ch-f05__num t-num">
              <span className="ch-f05__zeros" data-zeros>
                00
              </span>
              <span data-count>1</span>
            </span>
            <span className="ch-f05__of">
              <span className="t-label">Stores</span>
              <span className="ch-f05__of-note">Same cup in every one</span>
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Frames 06 to 08: the film (scroll-scrub engine)                     */

/** f07 progress windows: the white disc grows, then the flat wash, then the line. */
const WHITE_FROM = POUR_WHITE_WINDOW.from;
const WHITE_COVER = POUR_WHITE_WINDOW.cover;
const FILM_IDS: FrameId[] = ["f06", "f07", "f08"];

function PourFilm() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const { gsap, ScrollTrigger } = ensureGsap();
    const reduced = prefersReducedMotion();
    const articles = FILM_IDS.map((id) => document.getElementById(id));
    if (articles.some((a) => !a)) return;
    const [a06, a07, a08] = articles as HTMLElement[];
    // Under reduced motion the stills stack; flip once the pour still is on screen.
    const flipAt = reduced ? 0.35 : WHITE_COVER;
    let white = false;

    // Theme authority for the film: roast through the shot and the pour,
    // paper exactly when the white covers the frame (and back on the way up).
    const setWhite = (next: boolean) => {
      if (next === white) return;
      white = next;
      setStoryTheme(next ? "paper" : "roast");
      emitStoryEvent("pour-white", { white: next });
    };

    // Cover scale: the disc's solid core must reach the farthest corner from the cup.
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const core = 0.36 * 0.5 * Math.max(w, h);
      const reach = Math.hypot(0.5 * w, 0.52 * h);
      root.style.setProperty("--ss-cover", ((reach / core) * 1.04).toFixed(3));
    };
    measure();

    const apply = () => {
      const p7 = story.progress.f07;
      const p8 = story.progress.f08;
      const grow = range(p7, WHITE_FROM, WHITE_COVER);
      const wash = range(p7, WHITE_COVER - 0.05, WHITE_COVER + 0.01);
      const veil = 1 - range(p8, 0.03, 0.18);
      const lineIn = range(p7, WHITE_COVER + 0.005, WHITE_COVER + 0.07);
      const lineOut = range(p8, 0.05, 0.15);
      const copy8 = range(p8, 0.12, 0.28);
      const s = root.style;
      s.setProperty("--ss-white", (grow * grow * (3 - 2 * grow)).toFixed(4));
      s.setProperty("--ss-wash", wash.toFixed(4));
      s.setProperty("--ss-veil", veil.toFixed(4));
      s.setProperty("--ss-line", (lineIn * (1 - lineOut)).toFixed(4));
      s.setProperty("--ss-line-in", lineIn.toFixed(4));
      s.setProperty("--ss-line-out", lineOut.toFixed(4));
      s.setProperty("--ss-f08", copy8.toFixed(4));
      // The flip happens when the screen is white, never before.
      if (p8 > 0 || p7 >= 1) setWhite(true);
      else setWhite(p7 >= flipAt);
    };

    const ctx = gsap.context(() => {
      FILM_IDS.forEach((id, i) => {
        const el = articles[i]!;
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom top",
          onUpdate: (self) => {
            story.progress[id] = self.progress;
            apply();
          },
          onRefresh: (self) => {
            story.progress[id] = self.progress;
            measure();
            apply();
          },
        });
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (!self.isActive) return;
            setActiveFrame(id);
            if (id === "f06") setWhite(false);
          },
        });
      });

      if (reduced) return;
      // f06: the statement resolves from a ghost as the film arrives, then lifts away.
      gsap.fromTo(
        a06.querySelectorAll(
          ".scroll-scrub__kicker, .scroll-scrub__title, .scroll-scrub__body, .scroll-scrub__tags",
        ),
        { opacity: 0, y: 40, filter: "blur(10px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: a06, start: "top 75%", end: "top 15%", scrub: true },
        },
      );
      gsap.to(a06.querySelector(".scroll-scrub__copy"), {
        opacity: 0,
        y: () => -0.12 * window.innerHeight,
        filter: "blur(8px)",
        ease: "none",
        scrollTrigger: {
          trigger: a06,
          start: "35% top",
          end: "60% top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }, root);

    if (!reduced) {
      // Keep the pour wordless: f07's line and f08's copy are driven by --ss-* vars.
      root.dataset.armed = "";
      a07.dataset.ssLine = "";
      a08.dataset.ssLate = "";
    }

    window.addEventListener("resize", measure);
    apply();
    return () => {
      window.removeEventListener("resize", measure);
      ctx.revert();
      delete root.dataset.armed;
      delete a07.dataset.ssLine;
      delete a08.dataset.ssLate;
    };
  }, []);

  return (
    <div className="ch-film" ref={ref}>
      <ScrollScrub className="ch-scrub" firstHeading="h2" scenes={scrollScrubScenes} theme={scrollScrubTheme} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 09: community included                                        */

interface Layer {
  src: string;
  alt: string;
  w: number;
  h: number;
  depth: "bg" | "mid" | "subject" | "fg";
  /** Apparent scroll speed (1 = page speed). */
  speed: number;
  people: boolean;
  mobile: boolean;
}

const LAYERS: Layer[] = [
  {
    src: "/assets/interiors/white-hall.webp",
    alt: "A Platō café in morning light: white walls, a long white counter and pale floors",
    w: 2000,
    h: 1248,
    depth: "bg",
    speed: 0.55,
    people: false,
    mobile: true,
  },
  {
    src: "/assets/interiors/arches.webp",
    alt: "Arched windows, a green banquette and white tables in a Platō café",
    w: 2000,
    h: 1333,
    depth: "mid",
    speed: 0.8,
    people: false,
    mobile: false,
  },
  {
    src: "/assets/community/cafe-people.webp",
    alt: "Guests at the tables of a Platō café, with the counter beyond",
    w: 2000,
    h: 1500,
    depth: "subject",
    speed: 1,
    people: true,
    mobile: false,
  },
  {
    src: "/assets/community/baristas-smile.webp",
    alt: "Two Platō baristas smiling behind the counter",
    w: 2000,
    h: 1333,
    depth: "fg",
    speed: 1.4,
    people: true,
    mobile: true,
  },
];

/** How far below its resting place each quote starts (fraction of the viewport): deeper drifts less. */
const QUOTE_DEPTH = [0.32, 0.5, 0.24, 0.44];

function Community() {
  const ref = useRef<HTMLDivElement>(null);

  useScrollScene(ref, ({ el, gsap, ScrollTrigger, reduced, isMobile }) => {
    if (reduced) return;
    const frame = el.closest("section")!;
    const title = el.querySelector<HTMLElement>(".ch-f09__title-wrap");

    // Photography: classic layered parallax; each layer rests at its layout place mid-screen.
    // (The figure is the trigger; its inner layer moves, so measuring is never skewed.)
    el.querySelectorAll<HTMLElement>(".ch-shot").forEach((shot) => {
      if (isMobile && shot.dataset.mobile !== "true") return;
      const speed = Number(shot.dataset.speed || 1);
      const travel = () => (speed - 1) * 0.5 * (shot.offsetHeight + window.innerHeight);
      gsap.fromTo(
        shot.querySelector(".ch-shot__move"),
        { y: () => travel() },
        {
          y: () => -travel(),
          ease: "none",
          scrollTrigger: {
            trigger: shot,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
      // Transition out: the people fade back, leaving the empty, clean café.
      if (shot.dataset.people === "true") {
        gsap.fromTo(
          shot.querySelector(".ch-shot__frame"),
          { opacity: 1 },
          {
            opacity: 0,
            ease: "none",
            scrollTrigger: { trigger: frame, start: "bottom 72%", end: "bottom 22%", scrub: true },
          },
        );
      }
    });

    // Quotes drift up at their depth, fade in, and settle as they reach the centre.
    el.querySelectorAll<HTMLElement>(".ch-quote").forEach((card, i) => {
      const depth = QUOTE_DEPTH[i % QUOTE_DEPTH.length] * (isMobile ? 0.45 : 1);
      gsap.fromTo(
        card.querySelector(".ch-quote__card"),
        { y: () => depth * window.innerHeight, opacity: 0, filter: "blur(6px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          ease: "power1.out",
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "center center",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    });

    // The headline lifts slightly faster than the page as the section leaves.
    if (title) {
      gsap.to(title, {
        y: () => -0.12 * window.innerHeight,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top 20%",
          end: "40% top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }
  });

  return (
    <Frame className="ch-f09" id="f09" stageClassName="ch-f09__stage" vh={195}>
      <div className="ch-f09__field" ref={ref}>
        <header className="ch-f09__head">
          <div className="ch-f09__title-wrap">
            <GhostHeadline className="t-display ch-f09__title">Community included.</GhostHeadline>
          </div>
          <p className="ch-f09__note">
            <span className="t-label">From real reviews</span>
            <span className="ch-f09__note-body">
              What regulars say about the people behind the counter.
            </span>
          </p>
        </header>

        {LAYERS.map((layer, i) => (
          <figure
            className={`ch-shot ch-shot--${layer.depth}`}
            data-mobile={layer.mobile ? "true" : "false"}
            data-people={layer.people ? "true" : "false"}
            data-speed={layer.speed}
            key={layer.src}
            style={{ "--ar": `${layer.w} / ${layer.h}`, "--z": i } as CSSProperties}
          >
            <div className="ch-shot__move">
              <div className="ch-shot__frame">
                <img
                  alt={layer.alt}
                  decoding="async"
                  height={layer.h}
                  loading="lazy"
                  src={layer.src}
                  width={layer.w}
                />
              </div>
            </div>
          </figure>
        ))}

        <ul className="ch-quotes" aria-label="Customer reviews">
          {TESTIMONIALS.map((t, i) => (
            <li className={`ch-quote ch-quote--${i + 1}`} key={t.quote}>
              <figure className="ch-quote__card">
                <span aria-hidden="true" className="ch-quote__mark">
                  “
                </span>
                <blockquote className="ch-quote__text">
                  <p>{t.quote}</p>
                </blockquote>
                <figcaption className="ch-quote__who t-label">{t.where}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}
