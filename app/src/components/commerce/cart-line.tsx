// One line in the bag (drawer and /cart): thumbnail, title, variant, stepper, remove, total.
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { cart, cartDetails } from "@/lib/cart";
import { formatRand, isLiveVariant } from "@/lib/catalog";

import { announce } from "./announcer";
import { imageFit, splitTitle, variantName } from "./format";
import { useReducedMotion } from "./motion";
import { QuantityStepper } from "./quantity-stepper";
import "./cart-line.css";

export type CartItem = ReturnType<typeof cartDetails>["items"][number];

interface CartLineProps {
  item: CartItem;
  size?: "sm" | "lg";
  /** Just added: a sage wash and a small tag. */
  highlight?: boolean;
  index?: number;
}

export function CartLine({ item, size = "sm", highlight = false, index = 0 }: CartLineProps) {
  const { product, variant, quantity, total } = item;
  const { main, sub } = splitTitle(product.title);
  const name = variantName(product, variant);
  const live = isLiveVariant(variant);
  const [leaving, setLeaving] = useState(false);
  const reduced = useReducedMotion();
  const timer = useRef(0);
  const removeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const remove = () => {
    announce(`${main} removed from your bag.`);
    // Keep keyboard focus somewhere sensible once this line is gone.
    const button = removeRef.current;
    const hadFocus = button !== null && document.activeElement === button;
    const li = button?.closest("li");
    const sibling = li?.nextElementSibling ?? li?.previousElementSibling ?? null;
    const container = li?.closest<HTMLElement>("[role='dialog'], main");
    const finish = () => {
      cart.remove(variant.id);
      if (!hadFocus) return;
      requestAnimationFrame(() => {
        const target =
          sibling?.querySelector<HTMLElement>(".cl-remove") ??
          container?.querySelector<HTMLElement>(".cd-close, .cp-back, .ce-row") ??
          null;
        target?.focus();
      });
    };
    if (reduced) {
      finish();
      return;
    }
    setLeaving(true);
    timer.current = window.setTimeout(finish, 340);
  };

  return (
    <li
      className="cl"
      data-fit={imageFit(product)}
      data-leaving={leaving || undefined}
      data-new={highlight || undefined}
      data-size={size}
      style={{ "--i": index } as CSSProperties}
    >
      <Link aria-hidden="true" className="cl-thumb" params={{ handle: product.handle }} tabIndex={-1} to="/shop/$handle">
        <img alt="" decoding="async" height={240} loading="lazy" src={product.images[0]} width={240} />
      </Link>

      <div className="cl-info">
        {highlight ? <span className="cl-tag t-label">Just added</span> : null}
        <p className="cl-title">
          <Link params={{ handle: product.handle }} to="/shop/$handle">
            {main}
          </Link>
        </p>
        {sub ? <p className="cl-sub">{sub}</p> : null}
        {name ? <p className="cl-variant">{name}</p> : null}
        {quantity > 1 ? <p className="cl-unit t-num">{formatRand(variant.price)} each</p> : null}
        {!live ? <p className="cl-warn">This date has already taken place. Please remove it to check out.</p> : null}
      </div>

      <p className="cl-total t-num">
        <span className="sr-only">Line total </span>
        <span key={total}>{formatRand(total)}</span>
      </p>

      <div className="cl-actions">
        <QuantityStepper
          disabled={leaving}
          itemLabel={main}
          onChange={(q) => cart.setQuantity(variant.id, q)}
          size="sm"
          value={quantity}
        />
        <button className="cl-remove" disabled={leaving} onClick={remove} ref={removeRef} type="button">
          <span className="sr-only">Remove {main} from your bag</span>
          <span aria-hidden="true">Remove</span>
        </button>
      </div>
    </li>
  );
}
