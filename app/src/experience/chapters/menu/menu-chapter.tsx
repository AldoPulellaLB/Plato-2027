// Chapter four: the menu (frames 13 and 14). A pinned sideways gallery of the
// signature drinks on deep green, then the close: the opening line returns,
// with the way in (find a store, get the app) and the loyalty card on a phone.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline } from "@/components/site/text/reveal";
import { PlatoSymbol, Wordmark } from "@/components/site/wordmark";
import { Frame } from "@/experience/frame";
import { story } from "@/experience/story";
import { getLenis, prefersReducedMotion } from "@/lib/motion/smooth";
import { MENU_FEATURE, MENU_SECTIONS } from "@/lib/menu";
import { CONTACT } from "@/lib/site";

import { ArrowGlyph, ChapterLabel, ChLink } from "../shared/parts";
import {
  easeInOutCubic,
  playOn,
  range,
  revealOn,
  tickWhileNear,
  useScrollScene,
} from "../shared/motion";
import "./menu.css";

export function MenuChapter() {
  return (
    <div className="ch-chapter ch-menu" data-chapter="menu" id="menu">
      <SignatureMenu />
      <FindYourPlato />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 13: the signature menu                                        */

type Filter = "All" | (typeof MENU_FEATURE)[number]["filter"];
const FILTERS: Filter[] = ["All", ...Array.from(new Set(MENU_FEATURE.map((d) => d.filter)))];
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function SignatureMenu() {
  const ref = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const uid = useId();
  const [titleIn, setTitleIn] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");
  const [shown, setShown] = useState<Filter>("All");
  const items = MENU_FEATURE.filter((d) => shown === "All" || d.filter === shown);
  /** Bumped after every swap so the scroll scene re-measures the row. */
  const [layoutKey, setLayoutKey] = useState(0);

  // Active chip capsule: a sage copy of the row, clipped to the active chip.
  useIsoLayoutEffect(() => {
    const row = chipsRef.current;
    if (!row) return;
    const place = () => {
      const active = row.querySelector<HTMLElement>(`[data-filter="${filter}"]`);
      if (!active) return;
      const left = active.offsetLeft;
      const right = row.clientWidth - (active.offsetLeft + active.offsetWidth);
      row.style.setProperty("--cap-l", `${left}px`);
      row.style.setProperty("--cap-r", `${right}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [filter]);

  // Mobile: the chip row scrolls; drop its edge fade once the last chip is in view.
  useEffect(() => {
    const wrap = chipsRef.current?.parentElement;
    if (!wrap) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2;
      if (atEnd) wrap.dataset.end = "";
      else delete wrap.dataset.end;
    };
    const onChange = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    wrap.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  // Filtering: the row clears, the set swaps, the cards rise back in order.
  useEffect(() => {
    if (filter === shown) return;
    const track = trackRef.current;
    if (!track || prefersReducedMotion()) {
      setShown(filter);
      return;
    }
    track.dataset.swap = "out";
    const id = window.setTimeout(() => setShown(filter), 320);
    return () => window.clearTimeout(id);
  }, [filter, shown]);

  const swapped = useRef(false);
  useEffect(() => {
    // Skip the first run: the scene already measured the initial row.
    if (!swapped.current) {
      swapped.current = true;
      return;
    }
    const track = trackRef.current;
    setLayoutKey((k) => k + 1);
    if (!track || track.dataset.swap !== "out") return;
    track.dataset.swap = "in";
    const id = window.setTimeout(() => delete track.dataset.swap, 900);
    return () => window.clearTimeout(id);
  }, [shown]);

  useScrollScene(
    ref,
    ({ el, gsap, ScrollTrigger, reduced, isMobile }) => {
      const frame = el.closest("section")!;
      const track = trackRef.current!;
      const cards = Array.from(track.querySelectorAll<HTMLElement>(".ch-drink"));
      const imgs = cards.map((c) => c.querySelector<HTMLElement>(".ch-drink__img"));
      const head = el.querySelector<HTMLElement>(".ch-f13__head");
      const stopReveal = reduced
        ? () => {}
        : revealOn(ScrollTrigger, [head, el.querySelector(".ch-label")], frame, "top 55%");
      // The statement resolves from its ghost on the same beat as the head.
      const stopTitle = reduced ? () => {} : playOn(ScrollTrigger, frame, "top 55%", setTitleIn);

      const styleCards = (focusX: number, offset: number, step: number) => {
        cards.forEach((card, i) => {
          const c = card.offsetLeft + card.offsetWidth / 2 + offset;
          const dx = c - focusX;
          const near = Math.max(0, 1 - Math.abs(dx) / step);
          card.style.setProperty("--near", near.toFixed(3));
          card.style.transform = `scale(${(0.97 + near * 0.06).toFixed(4)})`;
          const img = imgs[i];
          if (img) {
            const max = card.offsetWidth * 0.13;
            const shift = Math.max(-max, Math.min(max, dx * 0.2));
            img.style.transform = `translate3d(${shift.toFixed(2)}px, 0, 0)`;
          }
        });
      };

      // Mobile and reduced motion: native swipe with snap; the nearest card is active.
      if (isMobile || reduced) {
        const scroller = el.querySelector<HTMLElement>(".ch-f13__rail")!;
        let raf = 0;
        const read = () => {
          raf = 0;
          const step = (cards[0]?.offsetWidth ?? 300) + 12;
          styleCards(scroller.clientWidth / 2, -scroller.scrollLeft, step);
        };
        const onScroll = () => {
          if (!raf) raf = requestAnimationFrame(read);
        };
        if (!reduced) {
          scroller.addEventListener("scroll", onScroll, { passive: true });
          read();
        }
        return () => {
          stopReveal();
          stopTitle();
          cancelAnimationFrame(raf);
          scroller.removeEventListener("scroll", onScroll);
          cards.forEach((c) => {
            c.style.removeProperty("transform");
            c.style.removeProperty("--near");
          });
          imgs.forEach((img) => img?.style.removeProperty("transform"));
        };
      }

      // Desktop: vertical scroll moves the row sideways; the reading point sits left of centre.
      const stage = frame.querySelector<HTMLElement>(".frame__stage");
      let maxX = 0;
      let step = 1;
      const measure = () => {
        const vw = window.innerWidth;
        const focus = vw * 0.34;
        // The rail always starts below the head (it wraps to two rows on narrower screens);
        // the cards shrink to fit what is left of the screen.
        if (head) {
          const headBottom = head.offsetTop + head.offsetHeight;
          el.style.setProperty("--ch-rail-min", `${Math.ceil(headBottom + 32)}px`);
        }
        const lastDrink = cards[cards.length - 1];
        const end = track.querySelector<HTMLElement>(".ch-drink-end");
        step = (cards[0]?.offsetWidth ?? 400) + 20;
        const lastCentre = lastDrink ? lastDrink.offsetLeft + lastDrink.offsetWidth / 2 : 0;
        const endRight = end ? end.offsetLeft + end.offsetWidth : lastCentre;
        // Travel until the last drink reaches the reading point (the end card follows it in).
        maxX = Math.max(
          0,
          lastCentre - focus,
          Math.min(endRight - vw + vw * 0.04, lastCentre - focus + step),
        );
      };
      measure();
      ScrollTrigger.addEventListener("refreshInit", measure);
      window.addEventListener("resize", measure);

      /** Sideways travel (px) for the row at pin progress t (0..1). */
      const travel = (t: number) => maxX * (t * 0.88 + easeInOutCubic(t) * 0.12);
      const T_FROM = 0.05;
      const T_TO = 0.86;

      // The populated row stays at full strength through the end of the pin and
      // scrolls away into the close: no blank forest screen.
      const update = () => {
        const p = story.progress.f13;
        const x = -travel(range(p, T_FROM, T_TO));
        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
        styleCards(window.innerWidth * 0.34, x, step);
      };
      const stopTick = tickWhileNear(ScrollTrigger, gsap, frame, update, "20%");

      // Keyboard: focusing a card scrolls the page to the point where that card
      // sits at the reading point (never a sideways scroll of the pinned stage).
      let focusRaf = 0;
      const resetStage = () => {
        if (stage) stage.scrollLeft = 0;
        el.scrollLeft = 0;
      };
      const onFocusIn = (e: FocusEvent) => {
        const item = (e.target as HTMLElement | null)?.closest<HTMLElement>(".ch-drink, .ch-drink-end");
        if (!item || !track.contains(item)) return;
        resetStage();
        const want = item.offsetLeft + item.offsetWidth / 2 - window.innerWidth * 0.34;
        let lo = 0;
        let hi = 1;
        if (want <= 0) hi = 0;
        else if (want >= maxX) lo = 1;
        else {
          for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            if (travel(mid) < want) lo = mid;
            else hi = mid;
          }
        }
        const t = (lo + hi) / 2;
        const p = T_FROM + t * (T_TO - T_FROM);
        const top = frame.getBoundingClientRect().top + window.scrollY;
        const y = top + p * Math.max(0, frame.offsetHeight - window.innerHeight);
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo({ top: y, behavior: "auto" });
        // Place the row now, before the browser's own scroll-into-view runs.
        ScrollTrigger.update();
        update();
        cancelAnimationFrame(focusRaf);
        focusRaf = requestAnimationFrame(resetStage);
      };
      track.addEventListener("focusin", onFocusIn);

      return () => {
        stopTick();
        stopReveal();
        stopTitle();
        cancelAnimationFrame(focusRaf);
        track.removeEventListener("focusin", onFocusIn);
        ScrollTrigger.removeEventListener("refreshInit", measure);
        window.removeEventListener("resize", measure);
        el.style.removeProperty("--ch-rail-min");
        track.style.removeProperty("transform");
        cards.forEach((c) => {
          c.style.removeProperty("transform");
          c.style.removeProperty("--near");
        });
        imgs.forEach((img) => img?.style.removeProperty("transform"));
      };
    },
    [layoutKey],
  );

  return (
    <Frame className="ch-frame ch-f13" id="f13" stageClassName="ch-stage ch-f13__stage">
      <div className="ch-f13__inner" ref={ref}>
        <header className="ch-f13__head">
          <div className="ch-f13__titles">
            <ChapterLabel chapter="menu" className="ch-f13__label" />
            <GhostHeadline className="ch-f13__h" play={titleIn} trigger="manual">
              The signature menu.
            </GhostHeadline>
          </div>
          <div className="ch-f13__tools">
            <div className="ch-chips-wrap">
              <div aria-label="Filter the drinks" className="ch-chips" ref={chipsRef} role="group">
                {FILTERS.map((f) => (
                  <button
                    aria-pressed={filter === f}
                    className="ch-chips__chip"
                    data-filter={f}
                    key={f}
                    onClick={() => setFilter(f)}
                    type="button"
                  >
                    {f}
                  </button>
                ))}
                <span aria-hidden="true" className="ch-chips__capsule">
                  {FILTERS.map((f) => (
                    <span className="ch-chips__ghost" key={f}>
                      {f}
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <ChLink className="ch-f13__all" href="/menu">
              <span>Full menu</span>
              <ArrowGlyph className="ch-f13__all-arrow" />
            </ChLink>
          </div>
        </header>

        <p aria-live="polite" className="sr-only">
          {filter === shown
            ? `Showing ${items.length} ${shown === "All" ? "signature" : shown.toLowerCase()} ${items.length === 1 ? "drink" : "drinks"}.`
            : ""}
        </p>
        <div className="ch-f13__rail">
          <ol
            aria-label={`${shown === "All" ? "Signature" : shown} drinks`}
            className="ch-f13__track"
            ref={trackRef}
          >
            {items.map((d, i) => (
              <li className="ch-drink" key={d.name} style={{ "--i": i } as CSSProperties}>
                <article
                  aria-labelledby={`${uid}-d${i}`}
                  className="ch-drink__card"
                  tabIndex={0}
                >
                  <div className="ch-drink__media">
                    <img
                      alt={`${d.name}, served at Platō`}
                      className="ch-drink__img"
                      decoding="async"
                      height={1607}
                      loading="lazy"
                      src={d.image}
                      width={1200}
                    />
                  </div>
                  <div className="ch-drink__top">
                    <span className="ch-drink__n t-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="ch-drink__price t-num">{d.price}</span>
                  </div>
                  <div className="ch-drink__meta">
                    <p className="ch-drink__filter t-label">{d.filter}</p>
                    <h3 className="ch-drink__name" id={`${uid}-d${i}`}>
                      {d.name}
                    </h3>
                    <p className="ch-drink__build">{d.build}</p>
                    <p className="ch-drink__note">{d.note}</p>
                  </div>
                </article>
              </li>
            ))}
            <li className="ch-drink-end" style={{ "--i": items.length } as CSSProperties}>
              <ChLink className="ch-drink-end__link" href="/menu">
                <PlatoSymbol className="ch-drink-end__mark" title="" />
                <span className="ch-drink-end__title">The full menu.</span>
                <span className="ch-drink-end__text">{MENU_SECTIONS.slice(0, 5).join(", ")}.</span>
                <span className="ch-drink-end__go">
                  See every drink
                  <ArrowGlyph className="ch-drink-end__arrow" />
                </span>
              </ChLink>
            </li>
          </ol>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* Frame 14: find your Platō                                           */

/* The app's own glyphs (thin strokes, as in the Platō app). */
const APP_STROKE = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

function AppMenuIcon() {
  return (
    <svg aria-hidden="true" className="ch-pa__icon" viewBox="0 0 24 24" {...APP_STROKE} strokeWidth="1.6">
      <path d="M3 6h17M3 12h13M3 18h15" />
    </svg>
  );
}
function AppChatIcon() {
  return (
    <svg aria-hidden="true" className="ch-pa__icon" viewBox="0 0 24 24" {...APP_STROKE} strokeWidth="1.6">
      <path d="M4 4.5h16v11.5h-5.2L12 19.5 9.2 16H4z" />
      <path d="M9 9h6" />
    </svg>
  );
}
function AppWalletIcon() {
  return (
    <svg aria-hidden="true" className="ch-pa__wallet" viewBox="0 0 24 24" {...APP_STROKE} strokeWidth="1.8">
      <path d="M4.5 9.5h15a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V11a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M6 9.5 13 5l2.2 4.5" />
      <circle cx="16.5" cy="14.75" r="1.6" />
    </svg>
  );
}
function AppChevronIcon() {
  return (
    <svg aria-hidden="true" className="ch-pa__chevron" viewBox="0 0 24 24" {...APP_STROKE} strokeWidth="2.6">
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}
function AppHomeIcon() {
  return (
    <svg aria-hidden="true" className="ch-pa__icon" viewBox="0 0 24 24" {...APP_STROKE} strokeWidth="1.5">
      <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" />
    </svg>
  );
}
function AppPinIcon() {
  return (
    <svg aria-hidden="true" className="ch-pa__icon" viewBox="0 0 24 24" {...APP_STROKE} strokeWidth="1.5">
      <path d="M12 18.5s-5.5-5-5.5-9.5a5.5 5.5 0 0 1 11 0c0 4.5-5.5 9.5-5.5 9.5Z" />
      <circle cx="12" cy="9" r="2" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

function FindYourPlato() {
  const ref = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useScrollScene(ref, ({ el, gsap, ScrollTrigger, reduced, isMobile }) => {
    if (reduced) return;
    const frame = el.closest("section")!;
    const phone = el.querySelector<HTMLElement>(".ch-phone");
    const stop = revealOn(
      ScrollTrigger,
      [el.querySelector(".ch-f14__ctas"), el.querySelector(".ch-f14__seal")],
      frame,
      "top 45%",
    );

    // The phone rises on the right as the close arrives.
    if (phone) {
      const dockEnd = isMobile ? "top 30%" : "top top";
      gsap.fromTo(
        phone.querySelector(".ch-phone__device"),
        { y: () => window.innerHeight * (isMobile ? 0.12 : 0.32), rotate: 5 },
        {
          y: 0,
          rotate: 0,
          ease: "none",
          scrollTrigger: {
            trigger: frame,
            start: "top bottom",
            end: dockEnd,
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
      // The app screen builds top to bottom over the last stretch of the dock,
      // landing complete as the phone settles (and unbuilding on the way back).
      const scrub = { trigger: frame, start: isMobile ? "top 80%" : "top 65%", end: dockEnd, scrub: 0.4 };
      gsap.fromTo(
        phone.querySelectorAll("[data-dock]"),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, ease: "power2.out", stagger: 0.14, scrollTrigger: scrub },
      );
      gsap.fromTo(
        phone.querySelectorAll(".ch-pa__img"),
        { scale: 1.12 },
        { scale: 1, ease: "power2.out", stagger: 0.14, scrollTrigger: scrub },
      );
    }

    // FindYourPlato: a magnetic pull toward the pointer.
    const cta = ctaRef.current;
    const zone = cta?.parentElement;
    if (!cta || !zone || isMobile) return stop;
    const label = cta.querySelector<HTMLElement>(".ch-find__inner");
    const qx = gsap.quickTo(cta, "x", { duration: 0.6, ease: "power3.out" });
    const qy = gsap.quickTo(cta, "y", { duration: 0.6, ease: "power3.out" });
    const lx = label ? gsap.quickTo(label, "x", { duration: 0.6, ease: "power3.out" }) : null;
    const ly = label ? gsap.quickTo(label, "y", { duration: 0.6, ease: "power3.out" }) : null;
    const move = (e: PointerEvent) => {
      const r = cta.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      qx(dx * 0.22);
      qy(dy * 0.32);
      lx?.(dx * 0.1);
      ly?.(dy * 0.14);
    };
    const leave = () => {
      qx(0);
      qy(0);
      lx?.(0);
      ly?.(0);
    };
    zone.addEventListener("pointermove", move);
    zone.addEventListener("pointerleave", leave);
    return () => {
      stop();
      zone.removeEventListener("pointermove", move);
      zone.removeEventListener("pointerleave", leave);
    };
  });

  return (
    <Frame className="ch-frame ch-f14" id="f14" stageClassName="ch-stage ch-f14__stage">
      <div className="ch-f14__inner" ref={ref}>
        <div className="ch-f14__copy">
          <PlatoSymbol className="ch-f14__seal" title="" />
          <GhostHeadline className="t-display ch-f14__h">
            Coffee sculpted. Community included.
          </GhostHeadline>
          <div className="ch-f14__ctas">
            <div className="ch-find-zone">
              <ChLink className="ch-find" href="/stores" ref={ctaRef}>
                <span className="ch-find__inner">
                  <span className="ch-find__label">Find your Platō</span>
                  <span aria-hidden="true" className="ch-find__arrow">
                    <ArrowGlyph />
                  </span>
                </span>
              </ChLink>
            </div>
            <a
              className="ch-app"
              href={CONTACT.loyaltyApp}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="ch-app__text">Get the app</span>
              <svg aria-hidden="true" className="ch-app__ext" fill="none" viewBox="0 0 16 16">
                <path
                  d="M5 11 11 5M6 5h5v5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.4"
                />
              </svg>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>

        <figure
          aria-label="The Platō loyalty app on a phone"
          className="ch-phone"
          role="img"
        >
          <div aria-hidden="true" className="ch-phone__device">
            <div className="ch-phone__screen">
              <div className="ch-phone__status">
                <span className="t-num">9:41</span>
                <span className="ch-phone__island" />
                <span className="ch-phone__bars">
                  <i />
                  <i />
                  <i />
                  <b />
                </span>
              </div>
              {/* The real Platō app home screen. [data-dock] items build in as the phone docks. */}
              <div className="ch-pa">
                <div className="ch-pa__bar" data-dock="">
                  <AppMenuIcon />
                  <Wordmark className="ch-pa__logo" title="" />
                  <AppChatIcon />
                </div>
                <div className="ch-pa__hello" data-dock="">
                  <p className="ch-pa__greet">
                    <span>Hellō</span> <b>Stephan</b>
                  </p>
                  <p className="ch-pa__balance">
                    <AppWalletIcon />
                    <b className="t-num">R150.00</b>
                  </p>
                </div>
                <div className="ch-pa__tiles">
                  <div className="ch-pa__tile" data-dock="">
                    <img alt="" className="ch-pa__img" decoding="async" loading="lazy" src="/assets/app/tile-gift.webp" />
                    <span className="ch-pa__tile-label">
                      Send
                      <br />a gift
                    </span>
                  </div>
                  <div className="ch-pa__tile" data-dock="">
                    <img alt="" className="ch-pa__img" decoding="async" loading="lazy" src="/assets/app/tile-vouchers.webp" />
                    <span className="ch-pa__tile-label">
                      My
                      <br />
                      vouchers
                    </span>
                  </div>
                </div>
                <hr className="ch-pa__rule" data-dock="" />
                <div className="ch-pa__promo" data-dock="">
                  <img alt="" className="ch-pa__img" decoding="async" loading="lazy" src="/assets/app/promo.webp" />
                  <span className="ch-pa__promo-text">
                    <span className="ch-pa__tile-label">
                      New in
                      <br />
                      store
                    </span>
                    <span className="ch-pa__promo-link">Shop the latest &gt;&gt;</span>
                  </span>
                  <span className="ch-pa__fab" data-dock="">
                    <AppChevronIcon />
                  </span>
                </div>
                <div className="ch-pa__nav" data-dock="">
                  <span className="ch-pa__dock">
                    <AppHomeIcon />
                    <span className="ch-pa__loyalty">
                      <PlatoSymbol className="ch-pa__loyalty-mark" title="" />
                    </span>
                    <AppPinIcon />
                  </span>
                  <span className="ch-pa__redeem">Redeem Loyalty</span>
                </div>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="ch-phone__shadow" />
        </figure>
      </div>
    </Frame>
  );
}
