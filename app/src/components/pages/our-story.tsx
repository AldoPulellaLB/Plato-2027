// /our-story: from a dream in Irene to about 150 locations and London. Story,
// mission and vision, the craft, a timeline of known facts, the founders and
// the closing line. Namespace: os-.
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline, RevealMedia, RollText, SplitReveal } from "@/components/site/text/reveal";
import { PlatoSymbol } from "@/components/site/wordmark";
import { ensureGsap, prefersReducedMotion } from "@/lib/motion/smooth";
import { BRANCHES, CONTACT, STORE_COUNT, STORY } from "@/lib/site";

import { DrawRule, PageLink, Rise, useHeroReveal, useParallax } from "./shared";
import "./our-story.css";

export function OurStoryPage() {
  const root = useRef<HTMLElement>(null);
  useParallax(root);
  return (
    <main className="pg os" id="main" ref={root}>
      <StoryHero />
      <Presence />
      <MissionVision />
      <Interiors />
      <Craft />
      <Timeline />
      <Founders />
      <Closing />
    </main>
  );
}

/* ------------------------------------------------------------------ hero */

function StoryHero() {
  const { play, stage } = useHeroReveal();
  return (
    <section aria-labelledby="os-title" className="os-hero" data-pg-hero={stage}>
      <div className="pg-wrap os-hero__grid">
        <div className="os-hero__meta pg-in">
          <span className="t-label">Our story</span>
          <span className="t-label os-hero__meta-end">Since 2019, from Irene</span>
        </div>
        <h1 className="os-hero__title" id="os-title">
          <GhostHeadline as="span" className="os-hero__l1" play={play} trigger="manual">
            It began
          </GhostHeadline>
          <GhostHeadline as="span" className="os-hero__l2" play={play} style={{ "--reveal-delay": "170ms" } as CSSProperties} trigger="manual">
            as a dream.
          </GhostHeadline>
        </h1>
        <div className="os-hero__arch pg-wipe" style={{ "--d": "240ms" } as CSSProperties}>
          <div className="pg-fill os-hero__arch-in">
            <img
              alt="A white Platō counter beneath a green wall"
              data-pg-speed="7"
              decoding="async"
              fetchPriority="high"
              height={1334}
              src="/assets/interiors/green-wall-bust.webp"
              width={2000}
            />
          </div>
        </div>
        <p className="os-hero__intro pg-in" style={{ "--d": "600ms" } as CSSProperties}>
          {STORY.intro}
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- presence */

function Presence() {
  const [first, ...rest] = STORY.presence.split(/(?<=\.)\s+/);
  return (
    <section aria-label="Where we are today" className="os-presence">
      <div className="pg-wrap os-presence__in">
        <SplitReveal as="p" className="os-presence__big" stagger={30}>
          {first}
        </SplitReveal>
        <Rise as="p" className="os-presence__body" delay={160}>
          {rest.join(" ")}
        </Rise>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- mission/vision */

function MissionVision() {
  const items = [
    { label: "Our mission", text: STORY.mission },
    { label: "Our vision", text: STORY.vision },
  ];
  return (
    <section aria-label="Mission and vision" className="os-mv">
      <div className="pg-wrap os-mv__grid">
        {items.map((it, i) => (
          <Rise as="article" className="os-mv__item" delay={i * 120} key={it.label}>
            <h2 className="os-mv__label t-label">{it.label}</h2>
            <p className="os-mv__text">{it.text}</p>
          </Rise>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- interiors */

function Interiors() {
  return (
    <section aria-labelledby="os-int-title" className="os-int">
      <div className="pg-wrap os-int__grid">
        <div className="os-int__copy">
          <GhostHeadline className="os-int__title" id="os-int-title">
            Clean, white, and made for people.
          </GhostHeadline>
          <SplitReveal className="os-int__line" delay={140}>
            Our stores are white and minimal, inspired by Japanese and Korean cafés, with Platō green against white walls and stone grey.
          </SplitReveal>
        </div>
        <div className="os-int__a" data-pg-speed="-6">
          <RevealMedia className="os-int__frame pg-frame">
            <img alt="Perforated ceiling light falling over a white Platō counter" decoding="async" height={1236} loading="lazy" src="/assets/interiors/perforated-overhead.webp" width={2000} />
          </RevealMedia>
        </div>
        <div className="os-int__b" data-pg-speed="12">
          <RevealMedia className="os-int__frame pg-frame" delay={120}>
            <img alt="White arches framing a Platō café interior" decoding="async" height={1333} loading="lazy" src="/assets/interiors/arches.webp" width={2000} />
          </RevealMedia>
        </div>
        <div className="os-int__c" data-pg-speed="-14">
          <RevealMedia className="os-int__frame pg-frame" delay={200}>
            <img alt="A long white hall with seating inside a Platō store" decoding="async" height={1248} loading="lazy" src="/assets/interiors/white-hall.webp" width={2000} />
          </RevealMedia>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- craft */

const CRAFT = [
  { title: "We roast our own coffee", detail: "At Blank, our own roastery. Medium roast, 100% Arabica.", href: "/shop", cta: "Shop the House Blend" },
  { title: "We operate our own bakery", detail: "One more part of Platō we choose to do ourselves.", href: null, cta: null },
  { title: "We supply our own equipment", detail: "Including Rocket machines and Eureka grinders for your own kitchen.", href: "/equipment", cta: "See the equipment" },
  { title: "We keep investing in our infrastructure", detail: "So every Platō experience feels both personal and professional.", href: null, cta: null },
];

function Craft() {
  return (
    <section aria-labelledby="os-craft-title" className="os-craft">
      <div className="pg-wrap">
        <div className="os-craft__head">
          <SplitReveal as="h2" className="os-craft__title" id="os-craft-title">
            Made by us, end to end.
          </SplitReveal>
        </div>
        <ol className="os-craft__list">
          {CRAFT.map((c, i) => (
            <Rise as="li" className="os-craft__row" delay={i * 80} key={c.title}>
              <span aria-hidden="true" className="os-craft__num t-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="os-craft__name">{c.title}</h3>
              <div className="os-craft__side">
                <p className="os-craft__detail">{c.detail}</p>
                {c.href && c.cta ? (
                  <PageLink className="os-craft__link" href={c.href}>
                    <RollText>{c.cta}</RollText>
                    <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
                  </PageLink>
                ) : null}
              </div>
            </Rise>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- timeline */

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "26 June 2023" → "2023-06-26" (no Date parsing, so server and every browser agree). */
function openedKey(opened: string) {
  const [d = "0", m = "", y = "0"] = opened.trim().split(/\s+/);
  const month = MONTHS.indexOf(m.toLowerCase()) + 1;
  return `${y.padStart(4, "0")}-${String(month).padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function Timeline() {
  const section = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  const growth = useMemo(
    () =>
      BRANCHES.filter((b) => /20(22|23)$/.test(b.opened))
        .slice()
        .sort((a, b) => openedKey(a.opened).localeCompare(openedKey(b.opened)))
        .map((b) => b.name),
    [],
  );

  const entries = [
    {
      when: "7 December 2019",
      year: "2019",
      title: "Café #1 opens in Irene.",
      text: "The first Platō, on the corner of Nelmapius and Main Avenue in Irene, Pretoria.",
      image: { src: "/assets/stores/container.webp", w: 2000, h: 1333, alt: "The first Platō in Irene" },
    },
    {
      when: "15 July 2020",
      year: "2020",
      title: "Café #2: Rustenburg.",
      text: "The second café opens on Kock Street, in North West.",
      image: null,
    },
    {
      when: "2022 to 2023",
      year: "2022",
      title: "Rapid growth across Gauteng and the Western Cape.",
      text: "And on into Mpumalanga, Limpopo and North West. Cafés opened in these two years include:",
      image: { src: "/assets/stores/hermanus.webp", w: 1600, h: 1067, alt: "Platō Hermanus, a thatched heritage cottage" },
      chips: growth,
    },
    {
      when: "Today",
      year: String(STORE_COUNT),
      title: `About ${STORE_COUNT} locations across South Africa.`,
      text: "Accessible, community-driven spaces where quality and connection matter.",
      image: null,
    },
    {
      when: "London",
      year: "LDN",
      title: "Norton Folgate, Bishopsgate.",
      text: "Platō, in London.",
      image: null,
    },
  ];

  useEffect(() => {
    const el = section.current;
    const line = fill.current;
    if (!el || !line || prefersReducedMotion()) return;
    const { gsap } = ensureGsap();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: el.querySelector(".os-tl__track"), start: "top 70%", end: "bottom 60%", scrub: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section aria-labelledby="os-tl-title" className="os-tl" ref={section}>
      <div className="pg-wrap">
        <div className="os-tl__head">
          <GhostHeadline className="os-tl__title" id="os-tl-title">
            From one café.
          </GhostHeadline>
        </div>
        <div className="os-tl__track">
          <span aria-hidden="true" className="os-tl__spine">
            <span className="os-tl__fill" ref={fill} />
          </span>
          <ol className="os-tl__list">
          {entries.map((e, i) => (
            <li className="os-tl__item" key={e.when}>
              <span aria-hidden="true" className="os-tl__dot" />
              <Rise className="os-tl__when" delay={0}>
                <span className="os-tl__year t-num">{e.year}</span>
                <span className="os-tl__date t-label">{e.when}</span>
              </Rise>
              <Rise className="os-tl__body" delay={100}>
                <h3 className="os-tl__name">{e.title}</h3>
                <p className="os-tl__text">{e.text}</p>
                {e.chips?.length ? (
                  <ul className="os-tl__chips">
                    {e.chips.map((c) => (
                      <li className="os-tl__chip" key={c}>
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Rise>
              {e.image ? (
                <div className={`os-tl__media os-tl__media--${i % 2 === 0 ? "a" : "b"}`}>
                  <RevealMedia className="os-tl__frame pg-frame" delay={160}>
                    <img alt={e.image.alt} decoding="async" height={e.image.h} loading="lazy" src={e.image.src} width={e.image.w} />
                  </RevealMedia>
                </div>
              ) : null}
            </li>
          ))}
          </ol>
        </div>
        <DrawRule className="os-tl__end" />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- founders */

function Founders() {
  const [a, b] = STORY.founders.split("&").map((s) => s.trim());
  return (
    <section aria-labelledby="os-f-title" className="os-f">
      <div className="pg-wrap os-f__grid">
        <Rise className="os-f__photo">
          <img alt={`Platō founders ${STORY.founders}`} decoding="async" height={257} loading="lazy" src="/assets/community/founders.webp" width={439} />
        </Rise>
        <div className="os-f__copy">
          <p className="os-f__label t-label">Founded by</p>
          <h2 className="os-f__names" id="os-f-title">
            <Rise as="span" className="os-f__name">
              {a}
            </Rise>
            <Rise as="span" className="os-f__name os-f__name--b" delay={120}>
              <span className="os-f__amp">&amp;</span> {b}
            </Rise>
          </h2>
          <Rise as="p" className="os-f__text" delay={200}>
            The people behind the first café in Irene, and every one since.
          </Rise>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- closing */

function Closing() {
  return (
    <section aria-labelledby="os-close-title" className="os-close">
      <div className="pg-wrap os-close__in">
        <PlatoSymbol aria-hidden="true" className="os-close__mark" title="" />
        <GhostHeadline className="os-close__title" id="os-close-title">
          {CONTACT.tagline}
        </GhostHeadline>
        <Rise className="os-close__ctas" delay={240}>
          <PageLink className="os-cta" href="/stores">
            <span className="os-cta__fill" aria-hidden="true" />
            <span className="os-cta__label">Find your Platō</span>
            <ArrowRight aria-hidden="true" className="os-cta__arrow" size={20} strokeWidth={1.5} />
          </PageLink>
          <PageLink className="os-cta os-cta--ghost" href="/menu">
            <span className="os-cta__fill" aria-hidden="true" />
            <span className="os-cta__label">See the menu</span>
            <ArrowRight aria-hidden="true" className="os-cta__arrow" size={20} strokeWidth={1.5} />
          </PageLink>
        </Rise>
      </div>
    </section>
  );
}
