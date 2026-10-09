// /cart: the full-page bag. Lines on the left, a sticky summary on the right.
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { CSSProperties } from "react";

import { cartCount, cartDetails, useCart } from "@/lib/cart";
import { formatRand, isLiveVariant, productByHandle } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";

import { CartEmpty } from "./cart-empty";
import { CartLine } from "./cart-line";
import { CheckoutSlab } from "./checkout-slab";
import { useMounted } from "./motion";
import { ProductCard } from "./product-card";
import "./cart-page.css";

const SUGGESTED = [
  "plato-house-blend-250g",
  "plato-coffee-pods-pack-of-10",
  "perfectted-ceremonial-matcha-250g",
  "chai-latte",
  "4wks-coffee-drip-bags-box",
  "plato-logo-cap",
];

export function CartPage() {
  const state = useCart();
  const mounted = useMounted();
  const { items, subtotal } = cartDetails(state);
  const count = cartCount(state);
  const inBag = new Set(items.map((i) => i.product.handle));
  const suggestions = SUGGESTED.filter((h) => !inBag.has(h))
    .map((h) => productByHandle(h))
    .filter((p): p is Product => Boolean(p))
    .slice(0, 4);
  const blocked = items.some((i) => !isLiveVariant(i.variant))
    ? "One of the Academy dates in your bag has already started. Remove it to continue."
    : null;

  return (
    <main className="cp" id="main">
      <header className="cp-head">
        <h1 aria-label="Your bag" className="cp-title">
          {Array.from("Your bag").map((ch, i) => (
            <span aria-hidden="true" className="cp-title__mask" key={`${ch}-${i}`}>
              <span className="cp-title__char" style={{ "--i": i } as CSSProperties}>
                {ch === " " ? " " : ch}
              </span>
            </span>
          ))}
          {mounted && count ? (
            <sup aria-hidden="true" className="cp-title__count t-num">
              {count}
            </sup>
          ) : null}
        </h1>
        <p className="cp-lede">
          {!mounted
            ? "Checking your bag."
            : count
              ? `${count} ${count === 1 ? "item" : "items"}, saved on this device until you check out.`
              : "Nothing here yet. Everything you add is kept on this device."}
        </p>
      </header>

      {!mounted ? (
        <div aria-hidden="true" className="cp-skeleton">
          <span />
          <span />
        </div>
      ) : items.length ? (
        <div className="cp-grid">
          <section aria-labelledby="cp-lines-title" className="cp-lines">
            <h2 className="sr-only" id="cp-lines-title">
              Items in your bag
            </h2>
            <ul className="cp-list">
              {items.map((item, i) => (
                <CartLine index={i} item={item} key={item.variantId} size="lg" />
              ))}
            </ul>
            <Link className="cp-back" to="/shop">
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.5} />
              <span>Continue shopping</span>
            </Link>
          </section>

          <aside aria-labelledby="cp-summary-title" className="cp-summary">
            <div className="cp-summary__inner">
              <h2 className="t-label cp-summary__title" id="cp-summary-title">
                Summary
              </h2>
              <dl className="cp-rows">
                <div className="cp-row">
                  <dt>Items</dt>
                  <dd className="t-num">{count}</dd>
                </div>
                <div className="cp-row cp-row--total">
                  <dt>Subtotal</dt>
                  <dd className="t-num">
                    <span key={subtotal}>{formatRand(subtotal)}</span>
                  </dd>
                </div>
              </dl>
              <CheckoutSlab blocked={blocked} lines={state.lines} subtotal={subtotal} />
            </div>
          </aside>
        </div>
      ) : (
        <CartEmpty variant="page" />
      )}

      {mounted && suggestions.length ? (
        <section aria-labelledby="cp-more-title" className="cp-more">
          <h2 className="cp-more__title" id="cp-more-title">
            {items.length ? "While you're here" : "From the roastery and the counter"}
          </h2>
          <div className="cp-more__grid">
            {suggestions.map((p, i) => (
              <ProductCard index={i} key={p.handle} product={p} slot={i} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
