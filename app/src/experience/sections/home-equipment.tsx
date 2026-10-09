// Equipment: an editorial spread. A giant machine on a stone panel bleeds off
// the left edge; the spec ledger on the right swaps the machine on hover/focus
// (touch screens get one slow pass through the five while in view, then it rests).
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { GhostHeadline, RevealMedia, SplitReveal } from "@/components/site/text/reveal";
import { productByHandle } from "@/lib/catalog";
import { prefersReducedMotion } from "@/lib/motion/smooth";

import { fromPrice, pad2, useDrift, useInView, usePaperTheme } from "./shared";
import "./home-equipment.css";

interface Machine {
  handle: string;
  brand: string;
  name: string;
  type: string;
  image: string;
  size: number;
}

const MACHINES: Machine[] = [
  {
    handle: "rocket-appartamento",
    brand: "Rocket",
    name: "Appartamento",
    type: "Espresso machine",
    image: "/assets/equipment/appartamento.webp",
    size: 990,
  },
  {
    handle: "rocket-cronometro-giotto-r",
    brand: "Rocket",
    name: "Cronometro Giotto R",
    type: "Espresso machine",
    image: "/assets/equipment/giotto.webp",
    size: 990,
  },
  {
    handle: "rocket-cronometro-mozzafiato-r",
    brand: "Rocket",
    name: "Cronometro Mozzafiato R",
    type: "Espresso machine",
    image: "/assets/equipment/mozzafiato.webp",
    size: 990,
  },
  {
    handle: "eureka-mignon-specialita-espresso-grinder",
    brand: "Eureka",
    name: "Mignon Specialita",
    type: "Espresso grinder",
    image: "/assets/equipment/eureka-specialita.webp",
    size: 1600,
  },
  {
    handle: "eureka-mignon-oro-xl-65-espress-grinder",
    brand: "Eureka",
    name: "Mignon ORO XL 65",
    type: "Espresso grinder",
    image: "/assets/equipment/eureka-oro.webp",
    size: 1600,
  },
];

const ROWS = MACHINES.flatMap((machine) => {
  const product = productByHandle(machine.handle);
  if (!product) return [];
  const finishes = product.variants.length;
  return [
    {
      machine,
      product,
      price: fromPrice(product),
      finishes: finishes > 1 ? `${finishes} finishes` : "One finish",
    },
  ];
});

const CYCLE_MS = 4200;

export function HomeEquipment() {
  const sectionRef = useRef<HTMLElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const ledgerRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  usePaperTheme(sectionRef);
  useInView(ledgerRef);
  // A gentle 3% drift keeps the machine clear of the caption while it is read.
  useDrift(driftRef, 3, sectionRef);

  // Touch screens have no hover: walk through the machines once while the
  // spread is on screen, then rest on the last one. Leaving the viewport pauses
  // the walk; the first touch or focus inside the section ends it for good, so
  // the shopper is never fighting an automatic change (WCAG 2.2.2).
  useEffect(() => {
    const el = sectionRef.current;
    if (
      !el ||
      ROWS.length < 2 ||
      prefersReducedMotion() ||
      !window.matchMedia("(hover: none)").matches
    ) {
      return;
    }
    const last = ROWS.length - 1;
    let taken = 0;
    let timer = 0;
    let done = false;
    let io: IntersectionObserver | null = null;

    const stop = () => {
      if (done) return;
      done = true;
      window.clearInterval(timer);
      io?.disconnect();
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("focusin", stop);
    };

    io = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(timer);
        if (done || !entry?.isIntersecting) return;
        timer = window.setInterval(() => {
          taken += 1;
          setActive((i) => Math.min(i + 1, last));
          if (taken >= last) stop();
        }, CYCLE_MS);
      },
      { threshold: 0.35 },
    );

    el.addEventListener("pointerdown", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("focusin", stop);
    io.observe(el);
    return stop;
  }, []);

  if (ROWS.length === 0) return null;
  const current = ROWS[Math.min(active, ROWS.length - 1)];

  return (
    <section aria-labelledby="hequip-title" className="hequip" id="home-equipment" ref={sectionRef}>
      <div className="hequip-grid">
        <div className="hequip-stage">
          <RevealMedia className="hequip-reveal" from="left">
            <div className="hequip-zoom">
              <div className="hequip-panel" ref={driftRef}>
                {ROWS.map(({ machine, product }, i) => (
                  <img
                    alt={i === active ? product.title : ""}
                    aria-hidden={i === active ? undefined : true}
                    className="hequip-img"
                    data-active={i === active ? "true" : "false"}
                    data-kind={machine.type === "Espresso grinder" ? "grinder" : "machine"}
                    decoding="async"
                    draggable={false}
                    height={machine.size}
                    key={machine.handle}
                    loading="lazy"
                    src={machine.image}
                    width={machine.size}
                  />
                ))}
              </div>
            </div>
          </RevealMedia>
          <div aria-hidden="true" className="hequip-caption">
            <span className="hequip-caption__no t-label t-num">
              {pad2(active + 1)} <span className="hequip-caption__of">/ {pad2(ROWS.length)}</span>
            </span>
            <span className="hequip-caption__name" key={current.machine.handle}>
              <span className="hequip-caption__brand t-label">
                {current.machine.brand} · {current.machine.type}
              </span>
              <span className="hequip-caption__title">{current.machine.name}</span>
            </span>
          </div>
        </div>

        <div className="hequip-copy">
          <GhostHeadline as="h2" className="hequip-title" id="hequip-title">
            A café bar at home.
          </GhostHeadline>
          <SplitReveal className="hequip-lede t-body" delay={180} stagger={18}>
            We roast our own coffee at Blank, operate our own bakery and supply our own equipment.
            Rocket espresso machines and Eureka grinders, ready for your kitchen counter.
          </SplitReveal>

          <ol aria-label="Equipment" className="hequip-ledger" ref={ledgerRef}>
            {ROWS.map(({ machine, product, price, finishes }, i) => (
              <li
                className="hequip-row"
                data-active={i === active ? "true" : "false"}
                key={machine.handle}
                style={{ "--i": i } as CSSProperties}
              >
                <Link
                  aria-label={`${product.title}, ${machine.type.toLowerCase()}, ${price.from ? "from " : ""}${price.amount}`}
                  className="hequip-row__link"
                  onFocus={() => setActive(i)}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setActive(i);
                  }}
                  params={{ handle: machine.handle }}
                  to="/shop/$handle"
                >
                  <span aria-hidden="true" className="hequip-row__no t-num">
                    {pad2(i + 1)}
                  </span>
                  <span aria-hidden="true" className="hequip-row__name">
                    <span className="hequip-row__meta t-label">
                      {machine.brand} · <span className="hequip-row__type">{machine.type}</span>
                    </span>
                    <span className="hequip-row__title">{machine.name}</span>
                  </span>
                  <span aria-hidden="true" className="hequip-row__finish">
                    {finishes}
                  </span>
                  <span aria-hidden="true" className="hequip-row__price t-num">
                    {price.from ? <span className="hequip-row__from">from</span> : null}
                    <span className="hequip-row__amount">{price.amount}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <Link className="hequip-cta" to="/equipment">
            <span className="hequip-cta__face">
              <span className="t-label-lg">Explore equipment</span>
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.5} />
            </span>
            <span aria-hidden="true" className="hequip-cta__face hequip-cta__face--wipe">
              <span className="t-label-lg">Explore equipment</span>
              <ArrowRight size={20} strokeWidth={1.5} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
