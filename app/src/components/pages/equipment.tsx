// /equipment: "A café bar at home." Editorial spreads for the Rocket machines
// and Eureka grinders, a craft note and a direct line for advice. Namespace: eq-.
import { ArrowRight, ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline, RollText, SplitReveal, RevealMedia } from "@/components/site/text/reveal";
import { PRODUCTS } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import { CONTACT, STORY } from "@/lib/site";

import { DrawRule, NewTab, PageLink, Rise, cleanCopy, firstSentences, jumpTo, rand, useHeroReveal, useParallax } from "./shared";
import "./equipment.css";

type Kind = "machine" | "grinder";

interface Detail {
  brand: string;
  name: string;
  /** Short model name for the call to action. */
  short: string;
  kind: Kind;
  shot: string;
  /** Every fact below is taken from the product's own description. */
  facts: { k: string; v: string }[];
  /** Shown when a product has a single variant but its description names finishes. */
  finishNote?: string;
}

const DETAILS: Record<string, Detail> = {
  "rocket-appartamento": {
    brand: "Rocket Espresso",
    name: "Appartamento",
    short: "Appartamento",
    kind: "machine",
    shot: "/assets/equipment/appartamento.webp",
    facts: [
      { k: "Boiler", v: "1.8 l total capacity" },
      { k: "Water", v: "Reservoir feed" },
      { k: "Power", v: "1350W, 220 to 240V" },
      { k: "Size", v: "274 W × 425 D × 360 H mm" },
      { k: "Weight", v: "20 kg" },
      { k: "PID and shot timer", v: "Not fitted" },
    ],
  },
  "rocket-cronometro-giotto-r": {
    brand: "Rocket Espresso",
    name: "Cronometro Giotto R",
    short: "Giotto R",
    kind: "machine",
    shot: "/assets/equipment/giotto.webp",
    facts: [
      { k: "Temperature", v: "Precise control" },
      { k: "Shot timer", v: "Digital" },
      { k: "Water", v: "Reservoir or direct supply" },
      { k: "Running", v: "Quiet and robust" },
      { k: "Pedigree", v: "Commercial machine technology" },
    ],
    finishNote: "Two body styles",
  },
  "rocket-cronometro-mozzafiato-r": {
    brand: "Rocket Espresso",
    name: "Cronometro Mozzafiato R",
    short: "Mozzafiato R",
    kind: "machine",
    shot: "/assets/equipment/mozzafiato.webp",
    facts: [
      { k: "Temperature", v: "PID control" },
      { k: "Shot timer", v: "Digital" },
      { k: "Boilers", v: "Insulated, 9mm end plates" },
      { k: "Pump", v: "Quiet rotary" },
      { k: "Water", v: "Reservoir, or direct supply" },
    ],
    finishNote: "Two body styles",
  },
  "eureka-mignon-specialita-espresso-grinder": {
    brand: "Eureka",
    name: "Mignon Specialita",
    short: "Specialita",
    kind: "grinder",
    shot: "/assets/equipment/eureka-specialita.webp",
    facts: [
      { k: "Burrs", v: "55mm" },
      { k: "Adjustment", v: "Stepless, micrometric" },
      { k: "Outflow", v: "ACE anti-clumping system" },
      { k: "Sound", v: "Near silent" },
      { k: "Controls", v: "Programmable touch screen" },
    ],
  },
  "eureka-mignon-oro-xl-65-espress-grinder": {
    brand: "Eureka",
    name: "Mignon ORO XL 65",
    short: "ORO XL 65",
    kind: "grinder",
    shot: "/assets/equipment/eureka-oro.webp",
    facts: [
      { k: "Burrs", v: "65mm Pure Diamond, patented" },
      { k: "Sharpness", v: "Holds its edge for longer" },
      { k: "Grind", v: "Steady consistency over time" },
      { k: "With us", v: "Our most popular espresso grinder" },
    ],
  },
};

const ORDER = Object.keys(DETAILS);

interface Item {
  product: Product;
  detail: Detail;
  index: number;
  lede: string;
  from: number;
}

function buildItems(): Item[] {
  return ORDER.flatMap((handle, index) => {
    const product = PRODUCTS.find((p) => p.handle === handle && p.category === "equipment");
    if (!product) return [];
    const detail = DETAILS[handle];
    const body = cleanCopy(product.description.split(/\b(?:SPECIFICATIONS|FEATURES)\b/)[0]);
    // Rocket's own copy says "our commercial machines"; on our page that means Rocket's.
    const lede = firstSentences(body, 2).replace(/\bour commercial machines\b/, "Rocket's commercial machines");
    const from = Math.min(...product.variants.map((v) => v.price));
    return [{ product, detail, index, lede, from }];
  });
}

const pad = (n: number) => String(n).padStart(2, "0");
const whatsappNumber = (() => {
  const m = CONTACT.whatsapp.match(/phone=(\d+)/);
  if (!m) return "";
  const d = m[1];
  return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
})();

export function EquipmentPage() {
  const items = useMemo(buildItems, []);
  const machines = items.filter((i) => i.detail.kind === "machine");
  const grinders = items.filter((i) => i.detail.kind === "grinder");
  const root = useRef<HTMLElement>(null);
  useParallax(root);

  return (
    <main className="pg eq" id="main" ref={root}>
      <EquipmentHero items={items} />
      <RangeIndex items={items} />

      <section aria-labelledby="eq-machines" className="eq-group-wrap">
        <GroupHead count={machines.length} id="eq-machines" line="Compact machines with technology drawn from the Rocket commercial range." title="Espresso machines" />
        {machines.map((item) => (
          <Spread item={item} key={item.product.handle} />
        ))}
      </section>

      <CraftNote />

      <section aria-labelledby="eq-grinders" className="eq-group-wrap">
        <GroupHead count={grinders.length} id="eq-grinders" line="Italian design, near silent, with stepless micrometric adjustment." title="Grinders" />
        {grinders.map((item) => (
          <Spread item={item} key={item.product.handle} />
        ))}
      </section>

      <Advice />
    </main>
  );
}

/* ------------------------------------------------------------------ hero */

function EquipmentHero({ items }: { items: Item[] }) {
  const { play, stage } = useHeroReveal();
  const machineFrom = Math.min(...items.filter((i) => i.detail.kind === "machine").map((i) => i.from));
  return (
    <section aria-labelledby="eq-title" className="eq-hero" data-pg-hero={stage}>
      <div className="eq-hero__grid pg-wrap">
        <div className="eq-hero__meta pg-in" style={{ "--d": "0ms" } as CSSProperties}>
          <span className="t-label">Equipment</span>
          <span className="t-label eq-hero__meta-mid">Rocket Espresso, Eureka</span>
          <span className="t-label t-num">
            {pad(items.length)} pieces
          </span>
        </div>

        <h1 className="eq-hero__title" id="eq-title">
          <GhostHeadline as="span" className="eq-hero__l1" play={play} trigger="manual">
            A café bar
          </GhostHeadline>
          <GhostHeadline as="span" className="eq-hero__l2" play={play} style={{ "--reveal-delay": "160ms" } as CSSProperties} trigger="manual">
            at home.
          </GhostHeadline>
        </h1>

        <div className="eq-hero__stage pg-wipe" style={{ "--d": "180ms" } as CSSProperties}>
          <div className="pg-fill eq-hero__stage-inner">
            <img
              alt="Rocket Appartamento espresso machine in white"
              className="eq-hero__machine"
              data-pg-speed="6"
              decoding="async"
              fetchPriority="high"
              height={990}
              src="/assets/equipment/appartamento.webp"
              width={990}
            />
          </div>
          <span aria-hidden="true" className="eq-hero__stage-tag t-label">
            Rocket Appartamento
          </span>
        </div>

        <div className="eq-hero__intro">
          <p className="eq-hero__lede pg-in" style={{ "--d": "520ms" } as CSSProperties}>
            Rocket espresso machines and Eureka grinders, supplied by Platō, for café ristretto pulled on your own counter.
          </p>
          <div className="eq-hero__actions pg-in" style={{ "--d": "640ms" } as CSSProperties}>
            <a
              className="eq-jump"
              href="#eq-range"
              onClick={(e) => {
                e.preventDefault();
                jumpTo("eq-range");
              }}
            >
              <span className="eq-jump__dot" aria-hidden="true" />
              <RollText>See the range</RollText>
            </a>
            {Number.isFinite(machineFrom) ? <span className="eq-hero__from t-num">Machines from {rand(machineFrom)}</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- range index */

function RangeIndex({ items }: { items: Item[] }) {
  return (
    <section aria-labelledby="eq-range-title" className="eq-range pg-anchor" id="eq-range" tabIndex={-1}>
      <div className="pg-wrap">
        <div className="eq-range__head">
          <h2 className="eq-range__title" id="eq-range-title">
            The range
          </h2>
          <p className="eq-range__note">Five pieces, chosen for the home bar. Tap one to jump to it.</p>
        </div>
        <ol className="eq-range__list">
          {items.map((item, i) => (
            <Rise as="li" delay={i * 80} key={item.product.handle}>
              <a
                className="eq-range__row"
                href={`#eq-${item.product.handle}`}
                onClick={(e) => {
                  e.preventDefault();
                  jumpTo(`eq-${item.product.handle}`);
                }}
              >
                <span className="eq-range__num t-num">{pad(i + 1)}</span>
                <span className="eq-range__name">
                  <span className="eq-range__brand">{item.detail.brand}</span>
                  <span className="eq-range__model">{item.detail.name}</span>
                </span>
                <span className="eq-range__kind">{item.detail.kind === "machine" ? "Espresso machine" : "Grinder"}</span>
                <span className="eq-range__price t-num">From {rand(item.from)}</span>
                <span aria-hidden="true" className="eq-range__thumb">
                  <img alt="" decoding="async" height={160} loading="lazy" src={item.detail.shot} width={160} />
                </span>
              </a>
            </Rise>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ group head */

function GroupHead({ id, title, count, line }: { id: string; title: string; count: number; line: string }) {
  return (
    <header className="eq-group pg-wrap">
      <DrawRule />
      <div className="eq-group__row">
        <span aria-hidden="true" className="eq-group__count t-num">
          {pad(count)}
        </span>
        <GhostHeadline className="eq-group__title" id={id}>
          {title}
        </GhostHeadline>
        <SplitReveal className="eq-group__line" delay={200}>
          {line}
        </SplitReveal>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- spread */

function Spread({ item }: { item: Item }) {
  const { product, detail, index, lede, from } = item;
  const multi = product.variants.length > 1;
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = product.variants.find((v) => v.id === selected) ?? null;
  const price = chosen ? chosen.price : from;
  const side = index % 2 === 0 ? "left" : "right";
  const altShot = product.images[1] ?? product.images[0];
  const titleId = `eq-${product.handle}-title`;
  const varies = new Set(product.variants.map((v) => v.price)).size > 1;

  return (
    <article aria-labelledby={titleId} className="eq-spread pg-wrap pg-anchor" data-side={side} id={`eq-${product.handle}`} tabIndex={-1}>
      <div className="eq-spread__media">
        <RevealMedia className="eq-panel" from={side === "left" ? "left" : "right"}>
          <div className="eq-panel__inner">
            <span aria-hidden="true" className="eq-panel__num t-num">
              {pad(index + 1)}
            </span>
            <div className="eq-panel__shots" data-pg-speed="5">
              <img
                alt={`${detail.brand} ${detail.name}`}
                className="eq-panel__shot"
                decoding="async"
                height={990}
                loading="lazy"
                src={detail.shot}
                width={990}
              />
              {altShot ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className="eq-panel__shot eq-panel__shot--alt"
                  decoding="async"
                  height={990}
                  loading="lazy"
                  src={altShot}
                  width={990}
                />
              ) : null}
            </div>
            <span aria-hidden="true" className="eq-panel__cap t-label">
              {detail.kind === "machine" ? "Espresso machine" : "Espresso grinder"}
            </span>
          </div>
        </RevealMedia>
      </div>

      <div className="eq-spread__copy">
        <p className="eq-spread__brand t-label">{detail.brand}</p>
        <SplitReveal as="h3" className="eq-spread__title" id={titleId}>
          {detail.name}
        </SplitReveal>
        <Rise as="p" className="eq-spread__lede" delay={120}>
          {lede}
        </Rise>

        <Rise className="eq-facts-wrap" delay={200}>
          <dl className="eq-facts">
            {detail.facts.map((f) => (
              <div className="eq-facts__row" key={f.k}>
                <dt>{f.k}</dt>
                <dd>{f.v}</dd>
              </div>
            ))}
          </dl>
        </Rise>

        <Rise className="eq-finish" delay={260}>
          {multi ? (
            <fieldset className="eq-finish__set">
              <legend className="t-label">Finish</legend>
              <div className="eq-finish__chips">
                {product.variants.map((v) => {
                  const active = selected === v.id;
                  return (
                    <button
                      aria-pressed={active}
                      className="eq-chip"
                      key={v.id}
                      onClick={() => setSelected(active ? null : v.id)}
                      type="button"
                    >
                      <span className="eq-chip__label">{v.title}</span>
                      {varies ? <span className="eq-chip__price t-num">{rand(v.price)}</span> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <p className="eq-finish__note">
              <span className="t-label">Finish</span>
              <span>{detail.finishNote ?? "One finish"}</span>
            </p>
          )}
        </Rise>

        <Rise className="eq-buy" delay={320}>
          <p className="eq-buy__price" aria-live="polite">
            <span className="eq-buy__from t-label">{chosen ? chosen.title : multi && varies ? "From" : "Price"}</span>
            <span className="eq-buy__num t-num">{rand(price)}</span>
          </p>
          <PageLink className="eq-cta" href={`/shop/${product.handle}`}>
            <span className="eq-cta__label">
              View the {detail.short}
            </span>
            <span aria-hidden="true" className="eq-cta__line" />
            <ArrowRight aria-hidden="true" className="eq-cta__arrow" size={18} strokeWidth={1.5} />
          </PageLink>
        </Rise>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------- craft note */

function CraftNote() {
  // STORY.craft, with the equipment clause set in italic.
  const marker = "supply our own equipment";
  const [before, after] = STORY.craft.split(marker);
  return (
    <section aria-label="Why buy equipment from Platō" className="eq-craft">
      <div className="eq-craft__grid pg-wrap">
        <div className="eq-craft__copy">
          <p className="t-label eq-craft__label">From our counter to yours</p>
          <Rise as="blockquote" className="eq-craft__quote">
            <p>
              {before}
              {after !== undefined ? (
                <>
                  <em>{marker}</em>
                  {after}
                </>
              ) : null}
            </p>
          </Rise>
          <Rise className="eq-craft__sign" delay={160}>
            <PageLink className="eq-craft__link" href="/our-story">
              <RollText>Read our story</RollText>
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
            </PageLink>
          </Rise>
        </div>
        <RevealMedia className="eq-craft__media pg-frame" from="right">
          <div className="pg-fill">
            <img
              alt="A Platō barista in green working the espresso machine"
              data-pg-speed="7"
              decoding="async"
              height={960}
              loading="lazy"
              src="/assets/community/barista-green.webp"
              width={1280}
            />
          </div>
        </RevealMedia>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- advice */

function Advice() {
  return (
    <section aria-labelledby="eq-advice-title" className="eq-advice pg-anchor" id="eq-advice">
      <div className="pg-wrap">
        <div className="eq-advice__head">
          <GhostHeadline className="eq-advice__title" id="eq-advice-title">
            Not sure which one?
          </GhostHeadline>
          <SplitReveal className="eq-advice__line" delay={160}>
            Tell us how you brew and how much counter you have. The team will help you choose a machine and grinder that suit you.
          </SplitReveal>
        </div>
        <div className="eq-advice__tiles">
          <Rise delay={0}>
            <a className="eq-tile" href={CONTACT.whatsapp} rel="noopener noreferrer" target="_blank">
              <span className="eq-tile__top">
                <MessageCircle aria-hidden="true" size={22} strokeWidth={1.5} />
                <span className="t-label">WhatsApp</span>
              </span>
              <span className="eq-tile__value t-num">{whatsappNumber}</span>
              <span className="eq-tile__foot">
                <span>Chat to the team</span>
                <ArrowUpRight aria-hidden="true" className="eq-tile__arrow" size={22} strokeWidth={1.5} />
              </span>
              <NewTab />
            </a>
          </Rise>
          <Rise delay={80}>
            <a className="eq-tile" href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Equipment advice")}`}>
              <span className="eq-tile__top">
                <Mail aria-hidden="true" size={22} strokeWidth={1.5} />
                <span className="t-label">Email</span>
              </span>
              <span className="eq-tile__value">{CONTACT.email}</span>
              <span className="eq-tile__foot">
                <span>Write to us</span>
                <ArrowUpRight aria-hidden="true" className="eq-tile__arrow" size={22} strokeWidth={1.5} />
              </span>
            </a>
          </Rise>
        </div>
      </div>
    </section>
  );
}
