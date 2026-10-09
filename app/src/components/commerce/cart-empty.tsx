// Empty bag: a calm serif line, one place to start, and an index of the ranges.
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

import { RollText } from "@/components/site/text/reveal";
import { PlatoSymbol } from "@/components/site/wordmark";
import { CATEGORIES, PRODUCTS, productByHandle } from "@/lib/catalog";

import { priceText, splitTitle } from "./format";
import { QuickAdd } from "./product-card";
import "./cart-empty.css";

const START_HANDLE = "plato-house-blend-250g";

export function CartEmpty({ variant = "drawer" }: { variant?: "drawer" | "page" }) {
  const start = productByHandle(START_HANDLE);
  const Heading = variant === "page" ? "h2" : "h3";
  return (
    <div className="ce" data-variant={variant}>
      <div className="ce-intro ce-stagger" style={{ "--i": 0 } as CSSProperties}>
        <PlatoSymbol className="ce-mark" title="" />
        <Heading className="ce-title">Your bag is empty.</Heading>
        <p className="ce-body">Start with the House Blend from our roastery, or browse the whole counter.</p>
      </div>

      {start ? (
        <div className="ce-start ce-stagger" style={{ "--i": 1 } as CSSProperties}>
          <Link className="ce-start__link" params={{ handle: start.handle }} to="/shop/$handle">
            <span className="ce-start__tile">
              <img alt="" decoding="async" height={240} loading="lazy" src={start.images[0]} width={240} />
            </span>
            <span className="ce-start__text">
              <span className="t-label ce-start__kicker">Start here</span>
              <span className="ce-start__title">{splitTitle(start.title).main}</span>
              <span className="ce-start__price t-num">{priceText(start)}</span>
            </span>
          </Link>
          {start.variants.length === 1 ? <QuickAdd label={start.title} variantId={start.variants[0].id} /> : null}
        </div>
      ) : null}

      <nav aria-label="Shop by range" className="ce-nav ce-stagger" style={{ "--i": 2 } as CSSProperties}>
        <ul className="ce-list">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link className="ce-row" search={{ c: c.id }} to="/shop">
                <RollText>{c.label}</RollText>
                <span className="ce-row__end">
                  <span className="ce-row__count t-num">{PRODUCTS.filter((p) => p.category === c.id).length}</span>
                  <ArrowRight aria-hidden="true" className="ce-row__arrow" size={18} strokeWidth={1.5} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
