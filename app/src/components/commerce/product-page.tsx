// /shop/$handle: gallery, sticky buy column (variants, quantity, AddToCart),
// the product story with a details ledger, and related products.
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Calendar } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

import { cart } from "@/lib/cart";
import { CATEGORIES, PRODUCTS, formatRand } from "@/lib/catalog";
import type { Category, Product, Variant } from "@/lib/catalog";
import { CONTACT } from "@/lib/site";

import { announce } from "./announcer";
import {
  buyable,
  extractVenue,
  imageFit,
  isDefaultVariant,
  optionLabel,
  pad2,
  splitDated,
  splitTitle,
  storyCopy,
  variantLabel,
  variantName,
} from "./format";
import { useReducedMotion, useRevealOnce } from "./motion";
import { ProductCard } from "./product-card";
import { QuantityStepper } from "./quantity-stepper";
import "./product-page.css";

const MORE_TITLE: Record<Category, string> = {
  coffee: "More coffee",
  pods: "More pods",
  instant: "More café drinks at home",
  matcha: "More matcha",
  merch: "More to wear",
  equipment: "More equipment",
  academy: "More Academy courses",
};

export function ProductPage({ product }: { product: Product }) {
  const category = CATEGORIES.find((c) => c.id === product.category);
  const live = buyable(product);
  const { main, sub } = splitTitle(product.title);
  const related = PRODUCTS.filter((p) => p.category === product.category && p.handle !== product.handle).slice(0, 4);
  const categoryCount = PRODUCTS.filter((p) => p.category === product.category).length;

  return (
    <main className="pdp" id="main" key={product.handle}>
      <nav aria-label="Breadcrumb" className="pdp-crumbs">
        <ol>
          <li>
            <Link to="/shop">Shop</Link>
          </li>
          <li>
            <Link search={{ c: product.category }} to="/shop">
              {category?.label ?? "Shop"}
            </Link>
          </li>
          <li aria-current="page">{main}</li>
        </ol>
      </nav>

      <div className="pdp-top">
        <Gallery product={product} title={main} />
        <div className="pdp-buy">
          <div className="pdp-buy__inner">
            <p className="t-label pdp-kicker pdp-in" style={{ "--d": 0 } as CSSProperties}>
              {category?.label}
            </p>
            <h1 className="pdp-title">
              <span className="pdp-title__mask">
                <span className="pdp-title__main pdp-rise" style={{ "--d": 1 } as CSSProperties}>
                  {main}
                </span>
              </span>
              {sub ? (
                <span className="pdp-title__sub pdp-in" style={{ "--d": 2 } as CSSProperties}>
                  {sub}
                </span>
              ) : null}
            </h1>
            {live.length ? <BuyBox live={live} product={product} title={main} /> : <ComingSoon product={product} title={main} />}
          </div>
        </div>
      </div>

      <ProductStory product={product} />

      {related.length ? (
        <section aria-labelledby="pdp-related-title" className="pdp-related">
          <div className="pdp-related__head">
            <h2 className="pdp-related__title" id="pdp-related-title">
              {MORE_TITLE[product.category]}
            </h2>
            <Link className="pdp-related__all" search={{ c: product.category }} to="/shop">
              <span>View all</span>
              <span className="t-num pdp-related__count">{categoryCount}</span>
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="pdp-related__grid">
            {related.map((p, i) => (
              <ProductCard index={i} key={p.handle} product={p} slot={i} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery                                                             */
/* ------------------------------------------------------------------ */

function Gallery({ product, title }: { product: Product; title: string }) {
  const images = product.images;
  const many = images.length > 1;
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const reduced = useReducedMotion();
  const labelId = useId();

  const go = (next: number) => {
    const target = (next + images.length) % images.length;
    if (target === index) return;
    setDir(next > index ? 1 : -1);
    setPrevious(index);
    setIndex(target);
  };

  // Gentle pointer parallax on the stage (fine pointers only).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduced || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = stage.getBoundingClientRect();
        stage.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        stage.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      stage.style.setProperty("--mx", "0");
      stage.style.setProperty("--my", "0");
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  const onThumbKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % images.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + images.length) % images.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = images.length - 1;
    if (next === null) return;
    e.preventDefault();
    go(next);
    thumbsRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!many || e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <section aria-labelledby={labelId} className="pdp-gallery" data-fit={imageFit(product)}>
      <h2 className="sr-only" id={labelId}>
        Images of {title}
      </h2>
      <div
        className="pdp-stage"
        data-dir={dir}
        onPointerCancel={() => (swipe.current = null)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        ref={stageRef}
      >
        <div className="pdp-stage__inner">
          {images.map((src, i) => (
            <img
              alt={i === index ? `${title}${many ? `, image ${i + 1} of ${images.length}` : ""}` : ""}
              aria-hidden={i === index ? undefined : true}
              className="pdp-shot"
              data-state={i === index ? "active" : i === previous ? "prev" : "idle"}
              decoding="async"
              fetchPriority={i === 0 ? "high" : undefined}
              height={1200}
              key={src}
              loading={i === 0 ? "eager" : "lazy"}
              src={src}
              width={1200}
            />
          ))}
        </div>
        {many ? (
          <>
            <p aria-live="polite" className="pdp-stage__count t-label t-num">
              <span className="sr-only">Image </span>
              {pad2(index + 1)}
              <span aria-hidden="true"> / </span>
              <span className="sr-only"> of </span>
              {pad2(images.length)}
            </p>
            <div className="pdp-stage__nav">
              <button aria-label="Previous image" className="pdp-stage__btn" onClick={() => go(index - 1)} type="button">
                <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.5} />
              </button>
              <button aria-label="Next image" className="pdp-stage__btn" onClick={() => go(index + 1)} type="button">
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
              </button>
            </div>
          </>
        ) : null}
      </div>

      {many ? (
        <div aria-label="Choose an image" className="pdp-thumbs" ref={thumbsRef} role="group">
          {images.map((src, i) => (
            <button
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-pressed={i === index}
              className="pdp-thumb"
              key={src}
              onClick={() => go(i)}
              onKeyDown={(e) => onThumbKey(e, i)}
              tabIndex={i === index ? 0 : -1}
              type="button"
            >
              <img alt="" decoding="async" height={160} loading="lazy" src={src} width={160} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Buy box                                                             */
/* ------------------------------------------------------------------ */

function BuyBox({ product, live, title }: { product: Product; live: Variant[]; title: string }) {
  const [variantId, setVariantId] = useState(live[0].id);
  const [quantity, setQuantity] = useState(1);
  const variant = live.find((v) => v.id === variantId) ?? live[0];
  const showPicker = Boolean(product.optionName) && !(live.length === 1 && isDefaultVariant(live[0]));
  const isDated = product.optionName === "Date";
  const varied = live.some((o) => o.price !== live[0].price);
  const qtyLabelId = useId();
  const [state, setState] = useState<"idle" | "added">("idle");
  const reduced = useReducedMotion();
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const add = () => {
    cart.add(variant.id, quantity);
    const name = variantName(product, variant);
    announce(`${quantity} × ${title}${name ? `, ${name}` : ""} added to your bag.`);
    setState("added");
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [
      window.setTimeout(() => cart.open(), reduced ? 0 : 560),
      window.setTimeout(() => setState("idle"), 2400),
    ];
  };

  return (
    <form
      className="pdp-form"
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <p className="pdp-price t-num pdp-in" style={{ "--d": 3 } as CSSProperties}>
        <span className="pdp-price__value" key={variant.price}>
          {formatRand(variant.price)}
        </span>
        {isDated ? <span className="pdp-price__per">per place</span> : null}
      </p>

      {showPicker ? (
        <fieldset className="pdp-options pdp-in" data-kind={isDated ? "date" : "chip"} style={{ "--d": 4 } as CSSProperties}>
          <legend className="t-label pdp-options__legend">
            {isDated ? "Choose a date" : optionLabel(product.optionName)}
            {!isDated ? <span className="pdp-options__current">{variantLabel(variant)}</span> : null}
          </legend>
          <div className="pdp-options__list">
            {live.map((v) => {
              const dated = isDated ? splitDated(v) : null;
              return (
                <label className="pdp-option" data-checked={v.id === variant.id || undefined} key={v.id}>
                  <input
                    checked={v.id === variant.id}
                    className="pdp-option__input"
                    name={`variant-${product.handle}`}
                    onChange={() => setVariantId(v.id)}
                    type="radio"
                    value={v.id}
                  />
                  <span aria-hidden="true" className="pdp-option__dot" />
                  {dated ? (
                    <span className="pdp-option__dated">
                      <span className="pdp-option__date">{dated.date}</span>
                      {dated.time ? <span className="pdp-option__time t-num">{dated.time}</span> : null}
                    </span>
                  ) : (
                    <span className="pdp-option__text">{variantLabel(v)}</span>
                  )}
                  {varied ? (
                    <span className="pdp-option__price t-num">{formatRand(v.price)}</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="pdp-qty pdp-in" style={{ "--d": 5 } as CSSProperties}>
        <span className="t-label pdp-qty__label" id={qtyLabelId}>
          {isDated ? "Places" : "Quantity"}
        </span>
        <QuantityStepper itemLabel={title} onChange={setQuantity} value={quantity} />
      </div>

      <div className="pdp-in" style={{ "--d": 6 } as CSSProperties}>
        <AddToCart label={isDated ? "Book your place" : "Add to bag"} state={state} total={variant.price * quantity} />
      </div>

      <p className="pdp-note pdp-in" style={{ "--d": 7 } as CSSProperties}>
        {isDated ? "Places are confirmed at checkout. " : "Delivery is calculated at checkout. "}
        <button className="pdp-note__link" onClick={() => cart.open()} type="button">
          View your bag
        </button>
      </p>
    </form>
  );
}

/** Full-width slab. A diagonal split (the cups' colour split) sweeps across on hover; confirms with a check. */
function AddToCart({ label, total, state }: { label: string; total: number; state: "idle" | "added" }) {
  const added = state === "added";
  const text = added ? "Added to your bag" : label;
  const price = formatRand(total);
  const content = (
    <>
      <span className="pdp-add__label" key={text}>
        {text}
      </span>
      <span className="pdp-add__price t-num">{price}</span>
      <span className="pdp-add__icon">
        <svg aria-hidden="true" className="pdp-add__arrow" fill="none" height="20" viewBox="0 0 24 24" width="20">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
        <svg aria-hidden="true" className="pdp-add__check" fill="none" height="22" viewBox="0 0 24 24" width="22">
          <path d="M4.5 12.5l4.8 4.8L19.5 7" pathLength={1} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
        </svg>
      </span>
    </>
  );
  return (
    <button aria-label={added ? `${text}` : `${label}, ${price}`} className="pdp-add" data-state={state} type="submit">
      <span className="pdp-add__layer pdp-add__layer--base">{content}</span>
      <span aria-hidden="true" className="pdp-add__layer pdp-add__layer--over">
        {content}
      </span>
    </button>
  );
}

function ComingSoon({ product, title }: { product: Product; title: string }) {
  const subject = encodeURIComponent(`Next dates: ${title}`);
  return (
    <div className="pdp-soon">
      <p className="pdp-price t-num pdp-in" style={{ "--d": 3 } as CSSProperties}>
        <span className="pdp-price__value">{formatRand(product.variants[product.variants.length - 1].price)}</span>
        <span className="pdp-price__per">per place</span>
      </p>
      <div className="pdp-soon__card pdp-in" style={{ "--d": 4 } as CSSProperties}>
        <Calendar aria-hidden="true" className="pdp-soon__icon" size={22} strokeWidth={1.5} />
        <h2 className="pdp-soon__title">New dates coming soon</h2>
        <p className="pdp-soon__body">
          Every date for this course has taken place. Email the Academy to ask about the next one.
        </p>
        <a className="pdp-soon__cta" href={`mailto:${CONTACT.academyEmail}?subject=${subject}`}>
          <span>Email the Academy</span>
          <span aria-hidden="true" className="pdp-soon__arrow">
            <ArrowUpRight size={18} strokeWidth={1.5} />
            <ArrowUpRight size={18} strokeWidth={1.5} />
          </span>
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Story + details ledger                                              */
/* ------------------------------------------------------------------ */

function ProductStory({ product }: { product: Product }) {
  const { lede, paragraphs } = storyCopy(product.description);
  const venue = extractVenue(product.description);
  const live = buyable(product);
  const category = CATEGORIES.find((c) => c.id === product.category);
  const isAcademy = product.category === "academy";
  const { ref: headRef } = useRevealOnce<HTMLDivElement>();
  const { ref: bodyRef } = useRevealOnce<HTMLDivElement>(120);

  const rows: { term: string; detail: React.ReactNode }[] = [];
  if (category) rows.push({ term: "Range", detail: category.label });
  if (product.optionName && live.length && !(live.length === 1 && isDefaultVariant(live[0]))) {
    rows.push({
      term: product.optionName === "Date" ? "Dates" : optionLabel(product.optionName),
      detail: (
        <span className="pdp-ledger__list">
          {live.map((v) => (
            <span key={v.id}>{variantName(product, v)}</span>
          ))}
        </span>
      ),
    });
  }
  if (venue) rows.push({ term: "Venue", detail: venue });
  if (!isAcademy) rows.push({ term: "Delivery", detail: "Calculated at checkout" });
  rows.push({ term: "Payment", detail: "Secure checkout by Stripe" });
  const email = isAcademy ? CONTACT.academyEmail : CONTACT.email;
  rows.push({
    term: "Questions",
    detail: (
      <a className="pdp-ledger__mail" href={`mailto:${email}`}>
        {email}
      </a>
    ),
  });

  return (
    <section aria-labelledby="pdp-story-title" className="pdp-story">
      <div className="pdp-story__head" ref={headRef}>
        <h2 className="t-label pdp-story__label" id="pdp-story-title">
          {isAcademy ? "About the course" : "About this product"}
        </h2>
        <p className="pdp-story__lede">{lede}</p>
      </div>
      <div className="pdp-story__cols" ref={bodyRef}>
        <div className="pdp-story__body">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        <dl className="pdp-ledger">
          {rows.map((row) => (
            <div className="pdp-ledger__row" key={row.term}>
              <dt className="t-label">{row.term}</dt>
              <dd>{row.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
