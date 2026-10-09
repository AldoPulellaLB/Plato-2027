// Shop the counter: a dense, draggable product rail straight after the story.
// Desktop: pointer drag with projected inertia that lands on a snap point,
// arrow buttons and a progress bar. Touch: native swipe with CSS snap.
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { announce } from "@/components/commerce/announcer";
import { RollText, SplitReveal } from "@/components/site/text/reveal";
import { cart } from "@/lib/cart";
import { CATEGORIES, PRODUCTS, liveVariants, productByHandle } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import { ensureGsap, prefersReducedMotion } from "@/lib/motion/smooth";

import { fromPrice, pad2, useDrift, useInView, usePaperTheme } from "./shared";
import "./home-shop.css";

interface Feature {
  handle: string;
  /** Short display name for the card (the full title stays in the accessible label). */
  name: string;
  detail?: string;
  /** The second image is a photograph, not a cut-out: fill the frame with it. */
  altFit?: "cover";
}

const FEATURED: Feature[] = [
  { handle: "plato-house-blend-250g", name: "House Blend", detail: "250g" },
  { handle: "plato-house-blend", name: "House Blend", detail: "1kg" },
  { handle: "decaf-plato-house-blend-250g", name: "Decaf House Blend", detail: "250g" },
  {
    handle: "plato-coffee-pods-pack-of-10",
    name: "Coffee Pods",
    detail: "Pack of 10, Nespresso compatible",
    altFit: "cover",
  },
  {
    handle: "perfectted-ceremonial-matcha-250g",
    name: "Ceremonial Grade Matcha",
    detail: "PerfectTed, 250g",
  },
  { handle: "caribbean-mocha", name: "Caribbean Mocha" },
  { handle: "the-plato-classic-crew", name: "The Classic Crew", altFit: "cover" },
  { handle: "plato-double-shot-or-nothing-cap", name: "Double Shot or Nothing Cap" },
];

interface Card {
  feature: Feature;
  product: Product;
  category: string;
  price: { amount: string; from: boolean };
  /** Variant QuickAdd puts straight in the cart; null when the shopper must choose an option. */
  quickVariant: string | null;
  details: string;
}

function optionSummary(product: Product) {
  const titles = product.variants.map((v) => v.title);
  switch (product.optionName) {
    case "Grind":
      return "Whole bean or ground";
    case "Size":
      return titles.length > 1 ? `${titles[0]} to ${titles[titles.length - 1]}` : titles[0];
    case "Color":
    case "Colour":
      return `${titles.length} colours`;
    default:
      return "";
  }
}

const CARDS: Card[] = FEATURED.flatMap((feature) => {
  const product = productByHandle(feature.handle);
  if (!product) return [];
  const category = CATEGORIES.find((c) => c.id === product.category)?.label ?? "";
  const live = liveVariants(product);
  return [
    {
      feature,
      product,
      category,
      price: fromPrice(product),
      quickVariant: product.optionName === null ? (live[0]?.id ?? null) : null,
      details: [feature.detail, optionSummary(product)].filter(Boolean).join(" · "),
    },
  ];
});

function ProductCard({ card, index }: { card: Card; index: number }) {
  const { product, feature } = card;
  const [added, setAdded] = useState(false);
  const timer = useRef(0);
  const alt = product.images[1];

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onAdd = () => {
    if (!card.quickVariant) return;
    cart.add(card.quickVariant, 1, { open: true });
    announce(`${product.title} added to your bag.`);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <li
      className="hshop-card"
      data-alt={alt ? "" : undefined}
      data-rail-item=""
      style={{ "--i": index } as CSSProperties}
    >
      {/* The li is the snap target and never transforms (Chrome snaps to transformed boxes). */}
      <div className="hshop-card__reveal">
        <div className="hshop-card__inner">
          <div className="hshop-card__frame">
            <div className="hshop-card__media">
              <img
                alt={product.title}
                className="hshop-card__img hshop-card__img--main"
                decoding="async"
                draggable={false}
                height={1200}
                loading="lazy"
                src={product.images[0]}
                width={1200}
              />
              {alt ? (
                <img
                  alt=""
                  className="hshop-card__img hshop-card__img--alt"
                  data-fit={feature.altFit}
                  decoding="async"
                  draggable={false}
                  height={1200}
                  loading="lazy"
                  src={alt}
                  width={1200}
                />
              ) : null}
              <span aria-hidden="true" className="hshop-card__cat t-label">
                {card.category}
              </span>
              <span aria-hidden="true" className="hshop-card__no t-label t-num">
                {pad2(index + 1)}
              </span>
            </div>

            {card.quickVariant ? (
              <button
                aria-label={
                  added ? `${product.title} added to your bag` : `Add ${product.title} to your bag`
                }
                className="hshop-qa"
                data-state={added ? "added" : "idle"}
                onClick={onAdd}
                type="button"
              >
                <span aria-hidden="true" className="hshop-qa__label">
                  {added ? "Added" : "Add"}
                </span>
                <span aria-hidden="true" className="hshop-qa__icon">
                  {added ? (
                    <Check size={18} strokeWidth={1.5} />
                  ) : (
                    <Plus size={20} strokeWidth={1.5} />
                  )}
                </span>
              </button>
            ) : (
              // Products with options (grind, size) open the product page; the
              // card link already does that, so this is a visual affordance only.
              <span aria-hidden="true" className="hshop-qa hshop-qa--choose">
                <span className="hshop-qa__label">
                  Choose {(product.optionName ?? "option").toLowerCase()}
                </span>
                <span className="hshop-qa__icon">
                  <ArrowUpRight size={18} strokeWidth={1.5} />
                </span>
              </span>
            )}
          </div>

          <div className="hshop-card__info">
            <h3 className="hshop-card__name">
              <Link
                aria-label={`${product.title}, ${card.price.from ? "from " : ""}${card.price.amount}`}
                className="hshop-card__link"
                draggable={false}
                params={{ handle: product.handle }}
                to="/shop/$handle"
              >
                <span className="hshop-card__nametext">{feature.name}</span>
              </Link>
            </h3>
            <p aria-hidden="true" className="hshop-card__price t-num">
              {card.price.from ? <span className="hshop-card__from">from</span> : null}
              {card.price.amount}
            </p>
            {card.details ? (
              <p aria-hidden="true" className="hshop-card__detail">
                {card.details}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/** Rail mechanics: drag with projected inertia, snap, arrows, progress, velocity skew. */
function useRail(count: number) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const goRef = useRef<(dir: 1 | -1) => void>(() => {});
  const [pos, setPos] = useState({ index: 1, atStart: true, atEnd: false });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { gsap } = ensureGsap();
    const reduced = prefersReducedMotion();
    let tween: ReturnType<typeof gsap.to> | null = null;
    let skewRaf = 0;
    let updateRaf = 0;
    let lastLeft = el.scrollLeft;
    let skew = 0;

    const maxScroll = () => Math.max(0, el.scrollWidth - el.clientWidth);
    // Snap points match the CSS (scroll-snap-align: start against the rail's
    // scroll padding): the first item rests at 0, every other item at its
    // layout offset from the first. offsetLeft ignores reveal/skew transforms.
    const snapPoints = () => {
      const items = Array.from(el.querySelectorAll<HTMLElement>("[data-rail-item]"));
      if (items.length === 0) return [0];
      const origin = items[0].offsetLeft;
      const max = maxScroll();
      const pts = items.map((item) =>
        Math.round(Math.min(max, Math.max(0, item.offsetLeft - origin))),
      );
      return Array.from(new Set(pts)).sort((a, b) => a - b);
    };
    const nearestIndex = (pts: number[], x: number) => {
      let best = 0;
      for (let i = 1; i < pts.length; i++)
        if (Math.abs(pts[i] - x) < Math.abs(pts[best] - x)) best = i;
      return best;
    };
    const setFree = (free: boolean) => {
      if (free) el.dataset.free = "true";
      else delete el.dataset.free;
    };
    const animateTo = (x: number, duration = 1.1) => {
      tween?.kill();
      const target = Math.min(maxScroll(), Math.max(0, x));
      setFree(true);
      if (reduced || Math.abs(target - el.scrollLeft) < 1) {
        el.scrollLeft = target;
        setFree(false);
        return;
      }
      tween = gsap.to(el, {
        scrollLeft: target,
        duration,
        ease: "expo.out",
        onComplete: () => {
          tween = null;
          setFree(false);
        },
      });
    };

    goRef.current = (dir) => {
      const pts = snapPoints();
      const i = nearestIndex(pts, el.scrollLeft);
      const next = pts[Math.min(pts.length - 1, Math.max(0, i + dir))];
      animateTo(next);
    };

    // Progress, counter and arrow state (React only hears about changes).
    const update = () => {
      updateRaf = 0;
      const max = maxScroll();
      const p = max > 0 ? el.scrollLeft / max : 0;
      const frac = el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1;
      const thumb = thumbRef.current;
      if (thumb) {
        thumb.style.setProperty("--hshop-thumb", String(frac));
        thumb.style.transform = `translate3d(${(p * (1 / frac - 1) * 100).toFixed(3)}%, 0, 0)`;
      }
      const index = Math.round(p * (count - 1)) + 1;
      const atStart = el.scrollLeft <= 2;
      const atEnd = el.scrollLeft >= max - 2;
      setPos((prev) =>
        prev.index === index && prev.atStart === atStart && prev.atEnd === atEnd
          ? prev
          : { index, atStart, atEnd },
      );
    };

    // Velocity skew: cards lean into fast movement, then settle.
    const skewLoop = () => {
      const left = el.scrollLeft;
      const delta = left - lastLeft;
      lastLeft = left;
      const target = Math.max(-1, Math.min(1, delta / 48)) * 2.4;
      skew += (target - skew) * 0.16;
      if (Math.abs(skew) < 0.01 && Math.abs(delta) < 0.1) {
        skew = 0;
        el.style.setProperty("--hshop-skew", "0deg");
        skewRaf = 0;
        return;
      }
      el.style.setProperty("--hshop-skew", `${skew.toFixed(3)}deg`);
      skewRaf = requestAnimationFrame(skewLoop);
    };

    const onScroll = () => {
      if (!updateRaf) updateRaf = requestAnimationFrame(update);
      if (!reduced && !skewRaf) {
        lastLeft = el.scrollLeft;
        skewRaf = requestAnimationFrame(skewLoop);
      }
    };

    // Mouse drag. Touch and pen keep native scrolling.
    let down = false;
    let dragging = false;
    let suppressClick = false;
    let pointerId = -1;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button")) return;
      down = true;
      dragging = false;
      suppressClick = false;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startLeft = el.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      tween?.kill();
      tween = null;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < 6) return;
        dragging = true;
        suppressClick = true;
        setFree(true);
        el.dataset.dragging = "true";
        try {
          el.setPointerCapture(pointerId);
        } catch {
          // Capture can fail if the pointer is already gone; dragging still works.
        }
      }
      e.preventDefault();
      el.scrollLeft = startLeft - dx;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      velocity = velocity * 0.55 + ((e.clientX - lastX) / dt) * 0.45;
      lastX = e.clientX;
      lastT = now;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== pointerId) return;
      down = false;
      if (!dragging) return;
      dragging = false;
      delete el.dataset.dragging;
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        // Already released.
      }
      if (performance.now() - lastT > 90) velocity = 0;
      // Project where the throw would come to rest, then land on the nearest card.
      const projected = el.scrollLeft - velocity * 420;
      const pts = snapPoints();
      animateTo(pts[nearestIndex(pts, projected)], 1.2);
    };
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };
    const onDragStart = (e: DragEvent) => e.preventDefault();
    // Horizontal trackpad gestures belong to the rail, not to the page's smooth scroll.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.stopPropagation();
        if (tween) {
          tween.kill();
          tween = null;
          setFree(false);
        }
      }
    };

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    update();

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    el.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      ro.disconnect();
      tween?.kill();
      cancelAnimationFrame(skewRaf);
      cancelAnimationFrame(updateRaf);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      el.removeEventListener("wheel", onWheel);
      el.style.removeProperty("--hshop-skew");
      goRef.current = () => {};
    };
  }, [count]);

  return { scrollerRef, thumbRef, pos, go: (dir: 1 | -1) => goRef.current(dir) };
}

export function HomeShop() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const { scrollerRef, thumbRef, pos, go } = useRail(CARDS.length);

  usePaperTheme(sectionRef);
  useInView(listRef, "0px 0px -8% 0px");
  useDrift(titleRef, 3, sectionRef, "x");

  if (CARDS.length === 0) return null;

  return (
    <section aria-labelledby="hshop-title" className="hshop" id="shop-the-counter" ref={sectionRef}>
      <header className="hshop-head">
        <div className="hshop-head__title" ref={titleRef}>
          <SplitReveal as="h2" className="hshop-title" id="hshop-title" stagger={70}>
            Take the counter home.
          </SplitReveal>
        </div>
        <div className="hshop-aside">
          <p className="hshop-lede t-body">
            The House Blend we roast at Blank, plus pods, matcha and Platō wear. Ordered here,
            delivered across South Africa.
          </p>
          <Link className="hshop-all" to="/shop">
            <span className="hshop-all__label t-label-lg">
              <RollText>Shop all</RollText>
            </span>
            <span aria-hidden="true" className="hshop-all__count t-num">
              {PRODUCTS.length}
            </span>
            <span aria-hidden="true" className="hshop-all__box">
              <ArrowUpRight className="hshop-all__a" size={20} strokeWidth={1.5} />
              <ArrowUpRight className="hshop-all__b" size={20} strokeWidth={1.5} />
            </span>
          </Link>
        </div>
      </header>

      <div
        aria-label="Featured products. Drag, swipe or use the arrows to browse."
        className="hshop-scroller"
        ref={scrollerRef}
        role="region"
        tabIndex={0}
      >
        <ul className="hshop-list" ref={listRef}>
          {CARDS.map((card, i) => (
            <ProductCard card={card} index={i} key={card.product.handle} />
          ))}
          <li
            className="hshop-end"
            data-rail-item=""
            style={{ "--i": CARDS.length } as CSSProperties}
          >
            <Link className="hshop-end__link" draggable={false} to="/shop">
              <span aria-hidden="true" className="hshop-end__disc" />
              <span className="hshop-end__count t-label t-num">{PRODUCTS.length} products</span>
              <span className="hshop-end__title">See the whole counter.</span>
              <span className="hshop-end__meta">
                Coffee, pods, matcha, wear, equipment and Academy courses.
              </span>
              <span aria-hidden="true" className="hshop-end__arrow">
                <ArrowUpRight size={28} strokeWidth={1.25} />
              </span>
            </Link>
          </li>
        </ul>
      </div>

      <div className="hshop-controls">
        <p aria-hidden="true" className="hshop-count t-num">
          <span className="hshop-count__now">{pad2(pos.index)}</span>
          <span className="hshop-count__sep">/</span>
          <span className="hshop-count__total">{pad2(CARDS.length)}</span>
        </p>
        <div aria-hidden="true" className="hshop-progress">
          <span className="hshop-progress__thumb" ref={thumbRef} />
        </div>
        <div className="hshop-arrows">
          <button
            aria-label="Previous products"
            className="hshop-nav"
            data-dir="prev"
            disabled={pos.atStart}
            onClick={() => go(-1)}
            type="button"
          >
            <span aria-hidden="true" className="hshop-nav__disc" />
            <ArrowLeft aria-hidden="true" className="hshop-nav__a" size={20} strokeWidth={1.5} />
            <ArrowLeft aria-hidden="true" className="hshop-nav__b" size={20} strokeWidth={1.5} />
          </button>
          <button
            aria-label="Next products"
            className="hshop-nav"
            data-dir="next"
            disabled={pos.atEnd}
            onClick={() => go(1)}
            type="button"
          >
            <span aria-hidden="true" className="hshop-nav__disc" />
            <ArrowRight aria-hidden="true" className="hshop-nav__a" size={20} strokeWidth={1.5} />
            <ArrowRight aria-hidden="true" className="hshop-nav__b" size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
