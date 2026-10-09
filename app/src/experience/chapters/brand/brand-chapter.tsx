// Chapter three: the brand (frames 10 to 12). The cups (WebGL) and their size
// labels, the same store with a local twist (pinned horizontal gallery with a
// fixed counter band), and the House Blend to take home.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline } from "@/components/site/text/reveal";
import { PlatoSymbol, Wordmark } from "@/components/site/wordmark";
import { Frame } from "@/experience/frame";
import { CUP_ROW_SLIDE_VW, cupRowSlide } from "@/experience/gl/modules/brand/choreo";
import { story } from "@/experience/story";
import { cart } from "@/lib/cart";
import { productByHandle } from "@/lib/catalog";
import { BRANCHES, LOCAL_STORES, STORE_COUNT } from "@/lib/site";

import { ArrowGlyph, BeanGlyph, ChapterLabel, ChLink } from "../shared/parts";
import {
  easeInOutCubic,
  playOn,
  range,
  revealOn,
  tickWhileNear,
  useScrollScene,
} from "../shared/motion";
import "./brand.css";

export function BrandChapter() {
  return (
    <div className="ch-chapter ch-brand" data-chapter="brand" id="brand">
      <CupFamily />
      <Stores />
      <TakeHome />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 10: the cup family                                            */

const CUPS = [
  { size: "Small", name: "Aristotle", tone: "sage", x: 30, mx: 22, anchor: "cup-s" },
  { size: "Medium", name: "Platō", tone: "peach", x: 50, mx: 50, anchor: "cup-m" },
  { size: "Large", name: "Socrates", tone: "green", x: 70, mx: 78, anchor: "cup-l" },
] as const;

function CupFamily() {
  const ref = useRef<HTMLDivElement>(null);

  useScrollScene(ref, ({ el, gsap, ScrollTrigger, reduced }) => {
    if (reduced) return;
    const frame = el.closest("section")!;
    const list = el.querySelector(".ch-cups");
    const label = el.querySelector(".ch-label");
    const mark = el.querySelector(".ch-f10__mark");
    // The wordmark letters rise with the cups' 80ms stagger; the labels land after their cups.
    const stop = revealOn(ScrollTrigger, [label, list, mark], frame, "top 30%");

    // Exit: the headline lifts away.
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: frame, start: "top top", end: "bottom bottom", scrub: true },
    });
    tl.to({}, { duration: 0.6 });
    tl.to(
      el.querySelector(".ch-f10__head"),
      { y: () => -0.1 * window.innerHeight, opacity: 0, duration: 0.3 },
      0.7,
    );

    // The labels ride the WebGL cup row's own exit curve (the same pure function
    // the 3D layer uses), so each name leaves the screen with its cup. The moving
    // part is an inner span; the li keeps its place for the GL anchor measure.
    const slides = Array.from(el.querySelectorAll<HTMLElement>(".ch-cup__slide"));
    const slide = () => {
      const vh = window.innerHeight || 1;
      const r = frame.getBoundingClientRect();
      const t = cupRowSlide(-r.top / vh, Math.max(0, r.height / vh - 1));
      const x = t * CUP_ROW_SLIDE_VW * window.innerWidth;
      const v = x > 0.5 ? `translate3d(${(-x).toFixed(1)}px, 0, 0)` : "";
      for (const s of slides) s.style.transform = v;
    };
    const stopSlide = tickWhileNear(ScrollTrigger, gsap, frame, slide, "20%");
    return () => {
      stop();
      stopSlide();
      for (const s of slides) s.style.transform = "";
    };
  });

  return (
    <Frame className="ch-frame ch-f10" id="f10" stageClassName="ch-stage ch-f10__stage">
      <div className="ch-f10__inner" ref={ref}>
        <ChapterLabel chapter="brand" className="ch-f10__label" />
        <div className="ch-f10__head">
          <GhostHeadline className="t-statement ch-f10__h">
            A different colour for every size.
          </GhostHeadline>
          <Wordmark className="ch-f10__mark" letterClassName="ch-f10__letter" title="" />
        </div>
        <ul className="ch-cups" aria-label="Cup sizes">
          {CUPS.map((cup, i) => (
            <li
              className="ch-cup"
              data-gl-anchor={cup.anchor}
              data-tone={cup.tone}
              key={cup.name}
              style={{ "--x": `${cup.x}%`, "--mx": `${cup.mx}%`, "--i": i } as CSSProperties}
            >
              <span className="ch-cup__slide">
                <span className="ch-cup__in">
                  <span aria-hidden="true" className="ch-cup__dot" />
                  <span className="ch-cup__size t-label">{cup.size}</span>
                  <span className="ch-cup__name">{cup.name}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 11: same store, local twist                                   */

const STORES = LOCAL_STORES.map((s) => {
  const branch = BRANCHES.find((b) => b.name === s.name);
  return { ...s, cafe: branch?.cafe, since: branch?.opened.split(" ").at(-1) };
});
const N = STORES.length;
const pad = (n: number) => String(n).padStart(2, "0");

function Stores() {
  const ref = useRef<HTMLDivElement>(null);
  const [titleIn, setTitleIn] = useState(false);

  useScrollScene(ref, ({ el, gsap, ScrollTrigger, reduced, isMobile }) => {
    const frame = el.closest("section")!;
    // The statement resolves from its ghost as the frame arrives (every layout).
    const stopTitle = reduced ? () => {} : playOn(ScrollTrigger, frame, "top 60%", setTitleIn);
    const track = el.querySelector<HTMLElement>(".ch-track")!;
    const scroller = el.querySelector<HTMLElement>(".ch-track-wrap")!;
    const panels = Array.from(el.querySelectorAll<HTMLElement>(".ch-panel"));
    const shelf = el.querySelector<HTMLElement>(".ch-shelf")!;
    const shelfZoom = el.querySelector<HTMLElement>(".ch-shelf__zoom");
    const route = el.querySelector<HTMLElement>(".ch-route__line")!;
    const pin = el.querySelector<HTMLElement>(".ch-route__pin")!;
    const ticks = Array.from(el.querySelectorAll<HTMLElement>(".ch-route__tick"));
    const fadeable = Array.from(el.querySelectorAll<HTMLElement>(".ch-f11__head, .ch-band"));
    const images = panels.map((p) => p.querySelector<HTMLElement>(".ch-panel__img"));
    let active = -1;

    const setActive = (i: number) => {
      const idx = Math.max(0, Math.min(N - 1, i));
      if (idx === active) return;
      active = idx;
      el.style.setProperty("--ch-i", String(idx));
      ticks.forEach((t, k) => (k === idx ? (t.dataset.active = "") : delete t.dataset.active));
      panels.forEach((p, k) => (k === idx ? (p.dataset.active = "") : delete p.dataset.active));
    };

    // Mobile and reduced motion: a native sideways row with snap points; the row
    // is a real scroller here, so it takes keyboard focus.
    if (isMobile || reduced) {
      scroller.tabIndex = 0;
      let raf = 0;
      const read = () => {
        raf = 0;
        const centre = scroller.scrollLeft + scroller.clientWidth / 2;
        const centres = panels.map((p) => p.offsetLeft + p.offsetWidth / 2);
        let best = 0;
        let bestD = Infinity;
        centres.forEach((c, i) => {
          const d = Math.abs(c - centre);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setActive(best);
        // The pin rides the route between store ticks, in step with the swipe.
        const u = Math.max(
          0,
          Math.min(1, (centre - centres[0]) / Math.max(1, centres[N - 1] - centres[0])),
        );
        pin.style.transform = `translate3d(${(u * route.clientWidth).toFixed(1)}px, 0, 0)`;
      };
      const onScroll = () => {
        if (!raf) raf = requestAnimationFrame(read);
      };
      scroller.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      read();
      return () => {
        stopTitle();
        cancelAnimationFrame(raf);
        scroller.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        scroller.removeAttribute("tabindex");
        pin.style.removeProperty("transform");
      };
    }

    // Desktop: vertical scroll drives the row sideways behind a fixed counter band.
    let centres: number[] = [];
    let maxX = 0;
    let first = 0;
    let last = 1;
    let routeW = 0;
    const measure = () => {
      const vw = window.innerWidth;
      centres = panels.map((p) => p.offsetLeft + p.offsetWidth / 2);
      maxX = Math.max(0, shelf.offsetLeft + shelf.offsetWidth / 2 - vw / 2);
      first = centres[0] ?? 0;
      last = centres[N - 1] ?? 1;
      routeW = route.clientWidth;
    };
    measure();
    ScrollTrigger.addEventListener("refreshInit", measure);

    const update = () => {
      const p = story.progress.f11;
      const vw = window.innerWidth;
      const t = easeInOutCubic(range(p, 0.02, 0.82)) * 0.15 + range(p, 0.02, 0.82) * 0.85;
      const x = -maxX * t;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      const cx = vw / 2 - x;
      let best = 0;
      let bestD = Infinity;
      centres.forEach((c, i) => {
        const dx = c - cx;
        const d = Math.abs(dx);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
        // The photograph drifts slower than its panel: depth inside each frame.
        const img = images[i];
        if (img && d < vw * 1.5)
          img.style.transform = `translate3d(${(-dx * 0.14).toFixed(2)}px, 0, 0) scale(1.16)`;
      });
      setActive(best);
      const u = Math.max(0, Math.min(1, (cx - first) / Math.max(1, last - first)));
      pin.style.transform = `translate3d(${(u * routeW).toFixed(1)}px, 0, 0)`;
      // The last panel zooms into the shelf of bags: the hand-off to frame 12.
      const fade = 1 - range(p, 0.72, 0.8);
      for (const f of fadeable) f.style.opacity = fade.toFixed(3);
      const z = easeInOutCubic(range(p, 0.84, 1));
      if (shelfZoom) shelfZoom.style.transform = `scale(${(1 + z * 0.9).toFixed(4)})`;
    };
    const stopTick = tickWhileNear(ScrollTrigger, gsap, frame, update, "20%");

    // Title arrives with the frame.
    const head = el.querySelector(".ch-f11__head");
    const stopReveal = revealOn(ScrollTrigger, [head], frame, "top 60%");

    return () => {
      stopTick();
      stopReveal();
      stopTitle();
      ScrollTrigger.removeEventListener("refreshInit", measure);
      track.style.removeProperty("transform");
      pin.style.removeProperty("transform");
      shelfZoom?.style.removeProperty("transform");
      for (const f of fadeable) f.style.removeProperty("opacity");
      for (const img of images) img?.style.removeProperty("transform");
    };
  });

  return (
    <Frame className="ch-frame ch-f11" id="f11" stageClassName="ch-stage ch-f11__stage">
      <div
        className="ch-f11__inner"
        ref={ref}
        style={{ "--ch-i": 0, "--ch-n": N } as CSSProperties}
      >
        <header className="ch-f11__head">
          <GhostHeadline className="ch-f11__h" play={titleIn} trigger="manual">
            The same Platō. A little bit local.
          </GhostHeadline>
          <p className="ch-f11__note">
            About {STORE_COUNT} stores share the same white interior. Each one keeps a little of where it is.
          </p>
        </header>

        <div aria-label="Platō stores" className="ch-track-wrap" role="region">
          <ol className="ch-track">
            {STORES.map((s, i) => (
              <li className="ch-panel" key={s.name} style={{ "--i": i } as CSSProperties}>
                <div className="ch-panel__frame">
                  <img
                    alt={`Platō ${s.name}: ${s.line.split(": ")[1] ?? s.line}`}
                    className="ch-panel__img"
                    decoding="async"
                    height={1333}
                    loading="lazy"
                    src={s.image}
                    width={2000}
                  />
                </div>
                <div className="ch-panel__tag">
                  {s.cafe ? <span className="t-num">Café #{s.cafe}</span> : null}
                  {s.since ? <span className="ch-panel__since">Since {s.since}</span> : null}
                </div>
                <p className="ch-panel__caption">
                  <span className="ch-panel__name">{s.name}</span>
                  <span className="ch-panel__line">{s.line}</span>
                </p>
              </li>
            ))}
            <li aria-label="House Blend on the shelf" className="ch-shelf">
              <div className="ch-shelf__zoom">
                <div aria-hidden="true" className="ch-shelf__wall" />
                <p aria-hidden="true" className="ch-shelf__sign">
                  <PlatoSymbol title="" />
                  <span>House Blend</span>
                </p>
                <div className="ch-shelf__bags">
                  <img
                    alt=""
                    className="ch-shelf__bag ch-shelf__bag--sm"
                    decoding="async"
                    height={1800}
                    loading="lazy"
                    src="/assets/brand/house-blend-250g.webp"
                    width={1800}
                  />
                  <img
                    alt=""
                    className="ch-shelf__bag ch-shelf__bag--lg"
                    decoding="async"
                    height={1800}
                    loading="lazy"
                    src="/assets/brand/house-blend-1kg.webp"
                    width={1800}
                  />
                  <img
                    alt=""
                    className="ch-shelf__bag ch-shelf__bag--sm ch-shelf__bag--far"
                    decoding="async"
                    height={1800}
                    loading="lazy"
                    src="/assets/brand/house-blend-250g.webp"
                    width={1800}
                  />
                </div>
                <div aria-hidden="true" className="ch-shelf__ledge" />
              </div>
            </li>
          </ol>
        </div>

        {/* The counter band: fixed on screen while the stores move behind it. */}
        <div className="ch-band" aria-hidden="true">
          <div className="ch-band__top">
            <svg className="ch-band__mark" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="ch-band__roll ch-band__roll--name">
              <div className="ch-band__rows">
                {STORES.map((s) => (
                  <span key={s.name}>{s.name}</span>
                ))}
              </div>
            </div>
            <div className="ch-band__roll ch-band__roll--line">
              <div className="ch-band__rows">
                {STORES.map((s) => (
                  <span key={s.name}>{s.line}</span>
                ))}
              </div>
            </div>
            <div className="ch-band__index t-num">
              <span className="ch-band__roll ch-band__roll--num">
                <span className="ch-band__rows">
                  {STORES.map((s, i) => (
                    <span key={s.name}>{pad(i + 1)}</span>
                  ))}
                </span>
              </span>
              <span className="ch-band__of">/ {pad(N)}</span>
            </div>
          </div>
          <div className="ch-route">
            <div className="ch-route__line">
              {STORES.map((s, i) => (
                <span
                  className="ch-route__tick"
                  key={s.name}
                  style={{ "--u": i / (N - 1) } as CSSProperties}
                >
                  <span className="ch-route__tick-label">{s.name}</span>
                </span>
              ))}
              <span className="ch-route__pin">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 22s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12Zm0-9.3a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z"
                    fillRule="evenodd"
                  />
                </svg>
              </span>
            </div>
          </div>
          <div className="ch-band__edge" />
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 12: take Platō home                                           */

const BAGS = [
  { handle: "plato-house-blend-250g", size: "250g" },
  { handle: "plato-house-blend", size: "1kg" },
] as const;

function TakeHome() {
  const ref = useRef<HTMLDivElement>(null);
  const [announce, setAnnounce] = useState("");
  const [titleIn, setTitleIn] = useState(false);

  useScrollScene(ref, ({ el, ScrollTrigger, reduced }) => {
    if (reduced) return;
    const frame = el.closest("section")!;
    // The copy rises in order; the statement resolves from its ghost on the same beat.
    const stopReveal = revealOn(ScrollTrigger, [el], frame, "top 45%");
    const stopTitle = playOn(ScrollTrigger, frame, "top 45%", setTitleIn);
    return () => {
      stopReveal();
      stopTitle();
    };
  });

  const chips = BAGS.flatMap((bag) => {
    const product = productByHandle(bag.handle);
    const variant = product?.variants.find((v) => v.title === "Whole Bean");
    return product && variant ? [{ ...bag, product, variant }] : [];
  });

  return (
    <Frame className="ch-frame ch-f12" id="f12" stageClassName="ch-stage ch-f12__stage">
      <div className="ch-f12__copy" ref={ref}>
        <p className="t-label ch-f12__kicker">
          <span className="ch-f12__dot" aria-hidden="true" />
          Take Platō home
        </p>
        <GhostHeadline className="ch-f12__h" delay={120} play={titleIn} trigger="manual">
          Our House Blend, from our roastery to your kitchen.
        </GhostHeadline>
        <p className="ch-f12__body">
          Medium roast, 100% Arabica from Tanzania, Guatemala and Brazil, roasted at Blank. Whole
          beans here; espresso and filter grinds in the shop.
        </p>
        {chips.length ? (
          <div
            aria-label="Add House Blend whole beans to your bag"
            className="ch-f12__chips"
            role="group"
          >
            {chips.map((c) => (
              <PriceChip
                key={c.variant.id}
                label={`${c.product.title}, whole bean`}
                onAdded={() => setAnnounce(`${c.product.title}, whole bean, added to your bag.`)}
                price={c.variant.price}
                size={c.size}
                variantId={c.variant.id}
              />
            ))}
          </div>
        ) : null}
        <ChLink className="ch-f12__more" href="/shop/plato-house-blend-250g">
          <span className="ch-f12__more-text">Choose a grind</span>
          <ArrowGlyph className="ch-f12__more-arrow" />
        </ChLink>
        <AcademyCard />
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
      </div>
    </Frame>
  );
}

/** PriceChip (frame 12): fills green from the left on hover; a bean drops in on add. */
function PriceChip({
  variantId,
  size,
  price,
  label,
  onAdded,
}: {
  variantId: string;
  size: string;
  price: number;
  label: string;
  onAdded: () => void;
}) {
  const [added, setAdded] = useState(0);
  const [showAdded, setShowAdded] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const value = `R${Math.round(price / 100)}`;

  return (
    <button
      aria-label={`Add ${label}, ${value}, to your bag`}
      className="ch-chip"
      data-added={showAdded ? "" : undefined}
      onClick={() => {
        cart.add(variantId, 1, { open: true });
        setAdded((n) => n + 1);
        setShowAdded(true);
        onAdded();
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setShowAdded(false), 2400);
      }}
      type="button"
    >
      <span aria-hidden="true" className="ch-chip__fill" />
      <span className="ch-chip__size">{size}</span>
      <span aria-hidden="true" className="ch-chip__sep" />
      <span className="ch-chip__price t-num">{value}</span>
      <span aria-hidden="true" className="ch-chip__icon">
        <svg fill="none" viewBox="0 0 20 20">
          <path
            className="ch-chip__plus"
            d="M10 4.5v11M4.5 10h11"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
          <path
            className="ch-chip__check"
            d="m5 10.4 3.2 3.1L15 6.8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </span>
      {added > 0 ? (
        <span aria-hidden="true" className="ch-chip__drop" key={added}>
          <BeanGlyph />
        </span>
      ) : null}
    </button>
  );
}

function AcademyCard() {
  return (
    <ChLink className="ch-academy" href="/academy">
      <span className="ch-academy__media">
        <img
          alt=""
          decoding="async"
          height={1024}
          loading="lazy"
          src="/assets/academy/pour-over.webp"
          width={768}
        />
      </span>
      <span className="ch-academy__body">
        <span className="t-label ch-academy__kicker">The Academy</span>
        <span className="ch-academy__title">Learn the craft behind the counter.</span>
        <span className="ch-academy__text">
          Hands-on courses, from home brewing to training as a café barista.
        </span>
      </span>
      <span aria-hidden="true" className="ch-academy__go">
        <ArrowGlyph />
      </span>
    </ChLink>
  );
}
