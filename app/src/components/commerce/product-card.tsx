// Product card (shop grid, related products, empty states) and the QuickAdd CTA.
import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { cart } from "@/lib/cart";
import { CATEGORIES } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";

import { announce } from "./announcer";
import { buyable, imageFit, pad2, priceSummary, priceText, splitTitle, variantChip, variantsMeta } from "./format";
import { useRevealOnce } from "./motion";
import "./product-card.css";

interface ProductCardProps {
  product: Product;
  index?: number;
  /** Large editorial card (spans two columns and two rows on wide screens). */
  feature?: boolean;
  /** Load the first image eagerly (above the fold). */
  eager?: boolean;
  /** Reveal stagger slot (0 to 3). */
  slot?: number;
}

export function ProductCard({ product, index, feature = false, eager = false, slot = 0 }: ProductCardProps) {
  const { ref } = useRevealOnce<HTMLElement>(slot * 80);
  const live = buyable(product);
  const price = priceSummary(product);
  const { main, sub } = splitTitle(product.title);
  const [primary, secondary] = product.images;
  const quick = live.length === 1 ? live[0] : null;
  const chips = live.length > 1 ? live.slice(0, 5) : [];
  const category = CATEGORIES.find((c) => c.id === product.category);

  return (
    <article
      className="pc"
      data-feature={feature || undefined}
      data-fit={imageFit(product)}
      data-swap={secondary ? true : undefined}
      ref={ref}
      style={{ "--slot": slot } as CSSProperties}
    >
      <div className="pc-media">
        <Link
          aria-hidden="true"
          className="pc-tile"
          params={{ handle: product.handle }}
          tabIndex={-1}
          to="/shop/$handle"
        >
          <span className="pc-imgs">
            <img
              alt=""
              className="pc-img pc-img--a"
              decoding="async"
              height={1200}
              loading={eager ? "eager" : "lazy"}
              src={primary}
              width={1200}
            />
            {secondary ? (
              <img alt="" className="pc-img pc-img--b" decoding="async" height={1200} loading="lazy" src={secondary} width={1200} />
            ) : null}
          </span>
          {index !== undefined ? <span className="pc-index t-label t-num">{pad2(index + 1)}</span> : null}
          {!price.onSale ? <span className="pc-badge t-label">Dates soon</span> : null}
          {chips.length ? (
            <span className="pc-chips">
              {chips.map((v, i) => (
                <span className="pc-chip" key={v.id} style={{ "--i": i } as CSSProperties}>
                  {variantChip(product, v)}
                </span>
              ))}
              {live.length > chips.length ? <span className="pc-chip">+{live.length - chips.length}</span> : null}
            </span>
          ) : null}
        </Link>
        {quick ? <QuickAdd label={main} variantId={quick.id} /> : null}
      </div>
      <div className="pc-meta">
        <h3 className="pc-title">
          <Link className="pc-link" params={{ handle: product.handle }} to="/shop/$handle">
            {main}
            {sub ? <span className="pc-sub">{sub}</span> : null}
          </Link>
        </h3>
        {feature && category ? <p className="pc-blurb">{category.blurb}</p> : null}
        <p className="pc-line">
          <span className="pc-kind">{variantsMeta(product)}</span>
          <span className="pc-price t-num">{priceText(product)}</span>
        </p>
      </div>
    </article>
  );
}

/** Circular plus that expands into "Add" on hover; confirms with a check. */
export function QuickAdd({ variantId, label }: { variantId: string; label: string }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [added]);

  return (
    <button
      aria-label={added ? `${label} added to your bag` : `Add ${label} to your bag`}
      className="pc-qa"
      data-added={added || undefined}
      onClick={() => {
        cart.add(variantId, 1);
        setAdded(true);
        announce(`${label} added to your bag.`);
      }}
      type="button"
    >
      <span aria-hidden="true" className="pc-qa__label">
        {added ? "Added" : "Add"}
      </span>
      <span aria-hidden="true" className="pc-qa__icon">
        <Plus className="pc-qa__plus" size={18} strokeWidth={1.5} />
        <Check className="pc-qa__check" size={18} strokeWidth={1.75} />
      </span>
    </button>
  );
}
