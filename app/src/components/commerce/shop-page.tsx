// /shop: giant serif title with the House Blend bag floating through it,
// a sticky filter + sort bar (deep-linkable), an editorial product grid.
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ArrowUpDown, ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import type { CSSProperties } from "react";

import { RollText } from "@/components/site/text/reveal";
import { PlatoSymbol } from "@/components/site/wordmark";
import { CATEGORIES, PRODUCTS } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import { ensureGsap, prefersReducedMotion, scrollToTarget } from "@/lib/motion/smooth";

import { sortPrice } from "./format";
import { useFromServer, useRevealOnce } from "./motion";
import { ProductCard } from "./product-card";
import "./shop-page.css";

export type ShopSort = "featured" | "price-asc" | "price-desc";

export const SHOP_SORTS: { id: ShopSort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price, low to high" },
  { id: "price-desc", label: "Price, high to low" },
];

const COUNTS = new Map<Category, number>(CATEGORIES.map((c) => [c.id, PRODUCTS.filter((p) => p.category === c.id).length]));

export function ShopPage({ category, sort = "featured" }: { category?: Category; sort?: ShopSort }) {
  const active = CATEGORIES.find((c) => c.id === category);
  const products = useMemo(() => {
    const list = category ? PRODUCTS.filter((p) => p.category === category) : [...PRODUCTS];
    if (sort === "price-asc") list.sort((a, b) => sortPrice(a) - sortPrice(b));
    if (sort === "price-desc") list.sort((a, b) => sortPrice(b) - sortPrice(a));
    return list;
  }, [category, sort]);
  const withFeature = sort === "featured" && products.length >= 4;
  const fromServer = useFromServer();
  const gridRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // After a filter or sort change, bring the top of the grid back into view.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const grid = gridRef.current;
    if (!grid) return;
    const top = grid.getBoundingClientRect().top;
    if (top < 0) scrollToTarget(grid, { offset: -180, duration: 1.1 });
  }, [category, sort]);

  return (
    <main className="shop" id="main">
      <ShopHero active={active} count={products.length} />
      <ShopBar category={category} sort={sort} />

      <section aria-labelledby="shop-results" className="shop-results" ref={gridRef}>
        <h2 className="sr-only" id="shop-results">
          {active ? active.label : "All products"}
        </h2>
        <p aria-live="polite" className="sr-only">
          {products.length} {products.length === 1 ? "product" : "products"}
          {active ? ` in ${active.label}` : ""}, sorted by {SHOP_SORTS.find((s) => s.id === sort)?.label.toLowerCase()}.
        </p>
        {products.length ? (
          <div className="shop-grid" data-intro={fromServer || undefined} key={`${category ?? "all"}-${sort}`}>
            {products.map((product, i) => (
              <ProductCard
                eager={i < 4}
                feature={withFeature && i === 0}
                index={i}
                key={product.handle}
                product={product}
                slot={i % 4}
              />
            ))}
          </div>
        ) : (
          <ShopEmpty label={active?.label} />
        )}
      </section>

      <ShopPromises />
      <ShopPoured />
    </main>
  );
}

/* ------------------------------------------------------------------ */

function ShopHero({ active, count }: { active?: (typeof CATEGORIES)[number]; count: number }) {
  const heroRef = useRef<HTMLElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const hero = heroRef.current;
    const bag = bagRef.current;
    const tilt = tiltRef.current;
    const title = titleRef.current;
    if (!hero || !bag || !tilt || !title) return;
    const { gsap } = ensureGsap();
    const ctx = gsap.context(() => {
      const scrub = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
      gsap.to(bag, { yPercent: -22, rotate: 7, ease: "none", scrollTrigger: scrub });
      gsap.to(title, { yPercent: 16, ease: "none", scrollTrigger: scrub });
    }, hero);
    const fine = window.matchMedia("(pointer: fine)").matches;
    const toX = gsap.quickTo(tilt, "x", { duration: 1.4, ease: "power3.out" });
    const toY = gsap.quickTo(tilt, "y", { duration: 1.4, ease: "power3.out" });
    const toR = gsap.quickTo(tilt, "rotate", { duration: 1.6, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      toX(nx * 34);
      toY(ny * 22);
      toR(nx * 5);
    };
    if (fine) hero.addEventListener("pointermove", onMove);
    return () => {
      hero.removeEventListener("pointermove", onMove);
      ctx.revert();
    };
  }, []);

  return (
    <header className="shop-hero" ref={heroRef}>
      <div className="shop-hero__meta">
        <p className="t-label shop-hero__kicker">Platō online store</p>
        <p className="t-label t-num shop-hero__count">
          {count} {count === 1 ? "product" : "products"}
        </p>
      </div>

      <h1 aria-label="Shop" className="shop-hero__title" ref={titleRef}>
        {Array.from("Shop").map((ch, i) => (
          <span aria-hidden="true" className="shop-hero__mask" key={ch}>
            <span className="shop-hero__char" style={{ "--i": i } as CSSProperties}>
              {ch}
            </span>
          </span>
        ))}
      </h1>

      <div aria-hidden="true" className="shop-hero__bag" ref={bagRef}>
        <div className="shop-hero__tilt" ref={tiltRef}>
          <img
            alt=""
            className="shop-hero__bag-img"
            decoding="async"
            fetchPriority="high"
            height={1581}
            src="/assets/brand/house-blend-cutout.webp"
            width={900}
          />
          <span className="shop-hero__shadow" />
        </div>
      </div>

      <div className="shop-hero__line" key={active?.id ?? "all"}>
        {active ? (
          <>
            <p className="shop-hero__statement">
              <em>{active.label}.</em>
            </p>
            <p className="shop-hero__blurb">{active.blurb}</p>
          </>
        ) : (
          <>
            <p className="shop-hero__statement">
              Everything we pour, <em>ready to take home.</em>
            </p>
            <p className="shop-hero__blurb">Coffee from our own roastery, pods, matcha, café drinks, equipment, Academy courses and wear.</p>
          </>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function ShopBar({ category, sort }: { category?: Category; sort: ShopSort }) {
  const navigate = useNavigate();
  const selectId = useId();
  const total = PRODUCTS.length;

  return (
    <div className="shop-bar">
      <div className="shop-bar__inner">
        <nav aria-label="Shop categories" className="shop-chips">
          <ul className="shop-chips__list">
            <li>
              <Link
                aria-current={!category ? "page" : undefined}
                className="shop-chip"
                data-active={!category || undefined}
                resetScroll={false}
                search={(prev) => ({ ...prev, c: undefined })}
                to="/shop"
              >
                <span className="shop-chip__fill" aria-hidden="true" />
                <span className="shop-chip__text">All</span>
                <sup className="shop-chip__count t-num">{total}</sup>
              </Link>
            </li>
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link
                  aria-current={category === c.id ? "page" : undefined}
                  className="shop-chip"
                  data-active={category === c.id || undefined}
                  resetScroll={false}
                  search={(prev) => ({ ...prev, c: c.id })}
                  to="/shop"
                >
                  <span className="shop-chip__fill" aria-hidden="true" />
                  <span className="shop-chip__text">{c.label}</span>
                  <sup className="shop-chip__count t-num">{COUNTS.get(c.id) ?? 0}</sup>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shop-sort">
          <label className="t-label shop-sort__label" htmlFor={selectId}>
            Sort
          </label>
          <span className="shop-sort__control">
            <select
              className="shop-sort__select"
              id={selectId}
              onChange={(e) => {
                const next = e.target.value as ShopSort;
                void navigate({
                  to: "/shop",
                  search: (prev) => ({ ...prev, s: next === "featured" ? undefined : next }),
                  replace: true,
                  resetScroll: false,
                });
              }}
              value={sort}
            >
              {SHOP_SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="shop-sort__chev" size={16} strokeWidth={1.5} />
            <ArrowUpDown aria-hidden="true" className="shop-sort__icon" size={16} strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ShopEmpty({ label }: { label?: string }) {
  return (
    <div className="shop-empty">
      <PlatoSymbol className="shop-empty__mark" title="" />
      <h3 className="shop-empty__title">Nothing on this shelf{label ? ` in ${label}` : ""} yet.</h3>
      <p className="t-body shop-empty__body">The rest of the shop is a step away.</p>
      <Link className="shop-empty__link" resetScroll={false} search={{}} to="/shop">
        <RollText>See everything</RollText>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
      </Link>
    </div>
  );
}

const PROMISES = [
  { n: "01", title: "From our own roastery", body: "Medium roast, 100% Arabica House Blend, roasted for every Platō counter and for yours." },
  { n: "02", title: "Delivered across South Africa", body: "Choose your delivery address at checkout." },
  { n: "03", title: "Secure checkout", body: "Payments are handled by Stripe, so your card details never touch our site." },
];

function ShopPromises() {
  return (
    <section aria-label="How the shop works" className="shop-promises">
      {PROMISES.map((p, i) => (
        <ShopPromise key={p.n} {...p} slot={i} />
      ))}
    </section>
  );
}

function ShopPromise({ n, title, body, slot }: { n: string; title: string; body: string; slot: number }) {
  const { ref } = useRevealOnce<HTMLDivElement>(slot * 80);
  return (
    <div className="shop-promise" ref={ref}>
      <span className="t-label t-num shop-promise__n">{n}</span>
      <h3 className="shop-promise__title">{title}</h3>
      <p className="shop-promise__body">{body}</p>
    </div>
  );
}

function ShopPoured() {
  const { ref } = useRevealOnce<HTMLDivElement>();
  return (
    <div className="shop-poured" ref={ref}>
      <Link className="shop-poured__link" to="/stores">
        <span className="shop-poured__q">Prefer it poured?</span>
        <span className="shop-poured__cta">
          <span className="t-label">Find your Platō</span>
          <span aria-hidden="true" className="shop-poured__arrow">
            <ArrowRight size={22} strokeWidth={1.5} />
          </span>
        </span>
      </Link>
    </div>
  );
}
