// /menu: the full in-store menu as an elevated typographic board, with a
// sticky section index and drink photos that follow the cursor on desktop.
// Namespace: mb-.
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { GhostHeadline, RollText, SplitReveal } from "@/components/site/text/reveal";
import { MENU, MENU_FEATURE, MENU_SECTIONS } from "@/lib/menu";
import type { MenuItem, MenuSection } from "@/lib/menu";
import { prefersReducedMotion } from "@/lib/motion/smooth";
import { CONTACT } from "@/lib/site";

import { NewTab, PageLink, Rise, jumpTo, useHeroReveal, useParallax } from "./shared";
import "./menu-board.css";

const SECTION_LINES: Record<MenuSection, string> = {
  Signature: "The drinks we are known for, most of them built on ristretto.",
  Classic: "Espresso bar standards, made our way.",
  Alternatives: "Chai, chocolate, red espresso and coconut.",
  "Matcha & Tea": "Ceremonial grade matcha, and six teas.",
  "Freezos & Sodas": "Blended, iced and fizzy.",
  Extras: "Make it yours.",
};

const SIZES = [
  { key: "S", label: "Small", cup: "sage" },
  { key: "M", label: "Medium", cup: "peach" },
  { key: "L", label: "Large", cup: "green" },
] as const;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const pad = (n: number) => String(n).padStart(2, "0");
const price = (n: number | null) => (n == null ? null : `R${n}`);
const prettyBuild = (b: string) => b.replace(/\s+\/\s+/g, " · ");

const FEATURE_INDEX = new Map(MENU_FEATURE.map((f, i) => [f.name, i]));

export function MenuPage() {
  const root = useRef<HTMLElement>(null);
  useParallax(root);
  const grouped = useMemo(
    () => MENU_SECTIONS.map((section) => ({ section, id: `mb-${slug(section)}`, items: MENU.filter((m) => m.section === section) })),
    [],
  );

  return (
    <main className="pg mb" id="main" ref={root}>
      <MenuHero />
      <Board grouped={grouped} />
      <Visit />
    </main>
  );
}

/* ------------------------------------------------------------------ hero */

const TRIO = [
  { name: "Aristotle", size: "S", cup: "sage", img: "/assets/drinks/aristotle.webp" },
  { name: "Platō", size: "M", cup: "peach", img: "/assets/drinks/plato.webp" },
  { name: "Socrates", size: "L", cup: "green", img: "/assets/drinks/socrates.webp" },
] as const;

function MenuHero() {
  const { play, stage } = useHeroReveal();
  const prices = TRIO.map((t) => {
    const item = MENU.find((m) => m.name === t.name);
    const p = item?.prices.find((x) => x != null);
    return p != null ? `R${p}` : "";
  });
  return (
    <section aria-labelledby="mb-title" className="mb-hero" data-pg-hero={stage}>
      <div className="pg-wrap mb-hero__grid">
        <div className="mb-hero__copy">
          <p className="mb-hero__label t-label pg-in">Our menu</p>
          <h1 className="mb-hero__title" id="mb-title">
            <GhostHeadline as="span" className="mb-hero__l1" play={play} trigger="manual">
              Built on
            </GhostHeadline>
            <GhostHeadline as="span" className="mb-hero__l2" play={play} style={{ "--reveal-delay": "160ms" } as CSSProperties} trigger="manual">
              ristretto.
            </GhostHeadline>
          </h1>
          <p className="mb-hero__lede pg-in" style={{ "--d": "560ms" } as CSSProperties}>
            From the Aristotle to the Freezo: our full in-store menu, with prices for small, medium and large.
          </p>
          <a
            className="mb-hero__jump pg-in"
            href="#mb-board"
            onClick={(e) => {
              e.preventDefault();
              jumpTo("mb-board", -88);
            }}
            style={{ "--d": "680ms" } as CSSProperties}
          >
            <span>Read the board</span>
            <span aria-hidden="true" className="mb-hero__jump-line" />
          </a>
        </div>

        <ul aria-label="Our three signature sizes" className="mb-trio">
          {TRIO.map((t, i) => (
            <li className="mb-trio__item" data-size={t.size} key={t.name}>
              <div className="mb-trio__float" data-pg-speed={[-4, -9, -14][i]}>
                <div className="mb-trio__frame pg-frame pg-wipe" style={{ "--d": `${260 + i * 110}ms` } as CSSProperties}>
                  <div className="pg-fill">
                    <img alt={`${t.name} in a ${t.size === "S" ? "small" : t.size === "M" ? "medium" : "large"} Platō cup`} decoding="async" fetchPriority={i === 1 ? "high" : undefined} height={1607} src={t.img} width={1200} />
                  </div>
                </div>
                <p className="mb-trio__cap pg-in" style={{ "--d": `${520 + i * 110}ms` } as CSSProperties}>
                  <span className="mb-dot" data-cup={t.cup} aria-hidden="true" />
                  <span className="mb-trio__size">{t.size}</span>
                  <span className="mb-trio__name">{t.name}</span>
                  <span className="mb-trio__price t-num">{prices[i]}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- board */

interface Group {
  section: MenuSection;
  id: string;
  items: MenuItem[];
}

function Board({ grouped }: { grouped: Group[] }) {
  const [active, setActive] = useState(grouped[0]?.id ?? "");
  const chipBar = useRef<HTMLDivElement>(null);

  // Track the section in the reading band of the viewport.
  useEffect(() => {
    const sections = grouped.map((g) => document.getElementById(g.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -62% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [grouped]);

  // Keep the active chip visible in the mobile chip bar.
  useEffect(() => {
    const bar = chipBar.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-target="${active}"]`);
    if (!bar || !chip || bar.scrollWidth <= bar.clientWidth) return;
    const left = chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2;
    bar.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [active]);

  const go = useCallback((id: string) => {
    const mobile = window.matchMedia("(max-width: 860px)").matches;
    const header = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 76;
    jumpTo(id, -(header + (mobile ? 72 : 28)));
    setActive(id);
  }, []);

  return (
    <section aria-label="The menu board" className="mb-board pg-anchor" id="mb-board" tabIndex={-1}>
      <div className="pg-wrap mb-board__grid">
        <nav aria-label="Menu sections" className="mb-index">
          <div className="mb-index__inner" ref={chipBar}>
            <p className="mb-index__label t-label">Sections</p>
            <ol className="mb-index__list">
              {grouped.map((g, i) => (
                <li key={g.id}>
                  <a
                    aria-current={active === g.id ? "true" : undefined}
                    className="mb-index__link"
                    data-target={g.id}
                    href={`#${g.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(g.id);
                    }}
                  >
                    <span aria-hidden="true" className="mb-index__tick" />
                    <span className="mb-index__num t-num">{pad(i + 1)}</span>
                    <span className="mb-index__name">{g.section}</span>
                    <span className="mb-index__count t-num" aria-label={`${g.items.length} items`}>
                      {g.items.length}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
            <p aria-hidden="true" className="mb-index__note">
              Prices in rand.
              <br />
              Menu June 2026.
            </p>
          </div>
        </nav>

        <Peek>
          {grouped.map((g) => (
            <section aria-labelledby={`${g.id}-title`} className="mb-sec" id={g.id} key={g.id} tabIndex={-1}>
              <header className="mb-sec__head">
                <GhostHeadline className="mb-sec__title" id={`${g.id}-title`}>
                  {g.section}
                </GhostHeadline>
                <SplitReveal className="mb-sec__line" delay={120}>
                  {SECTION_LINES[g.section]}
                </SplitReveal>
              </header>
              <table className="mb-table">
                <caption className="sr-only">{g.section}, prices in rand for small, medium and large</caption>
                <colgroup>
                  <col />
                  <col className="mb-table__pcol" />
                  <col className="mb-table__pcol" />
                  <col className="mb-table__pcol" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="mb-table__drink" scope="col">
                      <span className="sr-only">Drink</span>
                    </th>
                    {SIZES.map((s) => (
                      <th className="mb-table__size" key={s.key} scope="col">
                        <span aria-hidden="true" className="mb-dot" data-cup={s.cup} />
                        <abbr title={s.label}>{s.key}</abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((item) => {
                    const feature = FEATURE_INDEX.get(item.name);
                    const f = feature != null ? MENU_FEATURE[feature] : null;
                    return (
                      <tr className="mb-row" data-peek={feature ?? undefined} key={item.name}>
                        <th className="mb-row__drink" scope="row">
                          <span className="mb-row__in">
                            {f ? (
                              <span aria-hidden="true" className="mb-row__thumb">
                                <img alt="" decoding="async" height={1607} loading="lazy" src={f.image} width={1200} />
                              </span>
                            ) : null}
                            <span className="mb-row__text">
                              <span className="mb-row__name">
                                {item.name}
                                {f ? <span aria-hidden="true" className="mb-row__mark" /> : null}
                              </span>
                              <span className="mb-row__build">{prettyBuild(item.build)}</span>
                            </span>
                          </span>
                        </th>
                        {item.prices.map((p, i) => (
                          <td className="mb-row__price t-num" key={SIZES[i].key}>
                            {p != null ? price(p) : <span className="sr-only">Not offered in {SIZES[i].label.toLowerCase()}</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}

          <Rise className="mb-notes">
            <p className="mb-notes__milk">
              <span className="mb-notes__dots" aria-hidden="true">
                <span className="mb-dot" data-cup="sage" />
                <span className="mb-dot" data-cup="peach" />
                <span className="mb-dot" data-cup="green" />
              </span>
              Ask for any drink with milk alternatives: almond, soy, oat, macadamia, coconut or lactose-free.
            </p>
            <p className="mb-notes__small t-label">Prices in rand. Menu June 2026.</p>
          </Rise>
        </Peek>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- hover preview */

/** Wraps the board; on fine pointers a drink photo follows the cursor over rows that have one. */
function Peek({ children }: { children: ReactNode }) {
  const peek = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  // Photos only load once a mouse actually moves over the board.
  const [armed, setArmed] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const state = useRef({ x: 0, y: 0, tx: 0, ty: 0, vx: 0, raf: 0, running: false, reduced: false });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(mq.matches);
    update();
    state.current.reduced = prefersReducedMotion();
    mq.addEventListener("change", update);
    const s = state.current;
    return () => {
      mq.removeEventListener("change", update);
      cancelAnimationFrame(s.raf);
      s.running = false;
    };
  }, []);

  const tick = useCallback(() => {
    const s = state.current;
    const el = peek.current;
    if (!el) {
      s.running = false;
      return;
    }
    const k = s.reduced ? 1 : 0.16;
    const px = s.x;
    s.x += (s.tx - s.x) * k;
    s.y += (s.ty - s.y) * k;
    s.vx = s.reduced ? 0 : s.x - px;
    const tilt = Math.max(-8, Math.min(8, s.vx * 0.35));
    el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${tilt}deg)`;
    if (Math.abs(s.tx - s.x) < 0.2 && Math.abs(s.ty - s.y) < 0.2 && Math.abs(s.vx) < 0.05) {
      s.running = false;
      return;
    }
    s.raf = requestAnimationFrame(tick);
  }, []);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || e.pointerType !== "mouse") return;
    if (!armed) setArmed(true);
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-peek]");
    const idx = row?.dataset.peek != null ? Number(row.dataset.peek) : null;
    const s = state.current;
    s.tx = e.clientX + 28;
    s.ty = e.clientY - 120;
    if (idx !== current) {
      if (current === null && idx !== null) {
        // Appear at the cursor rather than flying in from the last spot.
        s.x = s.tx;
        s.y = s.ty;
      }
      setCurrent(idx);
    }
    if (!s.running) {
      s.running = true;
      s.raf = requestAnimationFrame(tick);
    }
  };

  const feature = current != null ? MENU_FEATURE[current] : null;

  return (
    <div className="mb-sections" onPointerLeave={() => setCurrent(null)} onPointerMove={onMove}>
      {children}
      {enabled && armed ? (
        <div aria-hidden="true" className="mb-peek" data-on={feature ? "true" : "false"} ref={peek}>
          <div className="mb-peek__card">
            <div className="mb-peek__media">
              {MENU_FEATURE.map((f, i) => (
                <img alt="" className="mb-peek__img" data-on={current === i ? "true" : "false"} decoding="async" height={1607} key={f.name} src={f.image} width={1200} />
              ))}
            </div>
            <p className="mb-peek__note">{feature?.note ?? ""}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- visit */

function Visit() {
  return (
    <section aria-labelledby="mb-visit-title" className="mb-visit">
      <div className="pg-wrap mb-visit__grid">
        <div className="mb-visit__media pg-frame">
          <img alt="Platō baristas smiling behind a white counter" data-pg-speed="7" decoding="async" height={1333} loading="lazy" src="/assets/community/baristas-smile.webp" width={2000} />
        </div>
        <div className="mb-visit__copy">
          <GhostHeadline className="mb-visit__title" id="mb-visit-title">
            Your order, by name.
          </GhostHeadline>
          <SplitReveal className="mb-visit__line" delay={120}>
            Every drink on this board is made at the counter of your nearest Platō.
          </SplitReveal>
          <Rise className="mb-visit__ctas" delay={200}>
            <PageLink className="mb-find" href="/stores">
              <span className="mb-find__label">Find your Platō</span>
              <span aria-hidden="true" className="mb-find__cups">
                <span className="mb-dot" data-cup="sage" />
                <span className="mb-dot" data-cup="peach" />
                <span className="mb-dot" data-cup="green" />
              </span>
              <ArrowRight aria-hidden="true" className="mb-find__arrow" size={22} strokeWidth={1.5} />
            </PageLink>
            <a className="mb-app" href={CONTACT.loyaltyApp} rel="noopener noreferrer" target="_blank">
              <RollText>Get the loyalty app</RollText>
              <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.5} />
              <NewTab />
            </a>
          </Rise>
        </div>
      </div>
    </section>
  );
}
