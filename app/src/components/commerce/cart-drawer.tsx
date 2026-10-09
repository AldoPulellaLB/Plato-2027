// Slide-out bag (mounted once in the root). Right-hand paper panel, modal
// dialog semantics, focus trap, Escape to close, scroll lock, focus restore.
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { cart, cartCount, cartDetails, useCart } from "@/lib/cart";
import { formatRand, isLiveVariant } from "@/lib/catalog";
import { lockScroll } from "@/lib/motion/smooth";

import { useAnnouncement } from "./announcer";
import { CartEmpty } from "./cart-empty";
import { CartLine } from "./cart-line";
import { CheckoutSlab } from "./checkout-slab";
import "./cart-drawer.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const state = useCart();
  const { items, subtotal } = cartDetails(state);
  const count = cartCount(state);
  const open = state.open;
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [seenBump, setSeenBump] = useState(0);
  const [highlight, setHighlight] = useState<string | null>(null);
  // Highlight the line that was just added, once per add, while the bag is open
  // (React's "adjust state while rendering" pattern rather than an effect).
  if (open && state.bump !== seenBump) {
    setSeenBump(state.bump);
    setHighlight(state.lastAdded);
  }
  const announcement = useAnnouncement();
  const blocked = items.some((i) => !isLiveVariant(i.variant))
    ? "One of the Academy dates in your bag has already taken place. Remove it to continue."
    : null;

  // Open/close housekeeping: scroll lock, initial focus, Escape, focus trap, restore.
  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockScroll(true);
    const raf = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cart.close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      lockScroll(false);
      if (restore && document.contains(restore)) restore.focus({ preventScroll: true });
    };
  }, [open]);

  // Let the highlight settle away.
  useEffect(() => {
    if (!highlight) return;
    const t = window.setTimeout(() => setHighlight(null), 3200);
    return () => window.clearTimeout(t);
  }, [highlight, seenBump]);

  return (
    <>
      <div className="cd" data-open={open} inert={!open}>
        <div aria-hidden="true" className="cd-scrim" onClick={() => cart.close()} />
        <aside aria-labelledby="cd-title" aria-modal="true" className="cd-panel" id="cart-drawer" ref={panelRef} role="dialog">
          <header className="cd-head cd-stagger" style={{ "--i": 0 } as CSSProperties}>
            <h2 className="cd-title" id="cd-title">
              Your bag
              <sup aria-hidden="true" className="cd-count t-num">
                <span key={count}>{count}</span>
              </sup>
              <span className="sr-only">
                , {count} {count === 1 ? "item" : "items"}
              </span>
            </h2>
            <button aria-label="Close your bag" className="cd-close" onClick={() => cart.close()} ref={closeRef} type="button">
              <X aria-hidden="true" size={20} strokeWidth={1.5} />
            </button>
          </header>

          <div className="cd-body" data-lenis-prevent="">
            {items.length ? (
              <ul aria-label="Items in your bag" className="cd-lines">
                {items.map((item, i) => (
                  <CartLine highlight={highlight === item.variantId} index={i} item={item} key={item.variantId} />
                ))}
              </ul>
            ) : (
              <CartEmpty variant="drawer" />
            )}
          </div>

          {items.length ? (
            <footer className="cd-foot cd-stagger" style={{ "--i": 3 } as CSSProperties}>
              <div className="cd-sub">
                <span className="t-label">Subtotal</span>
                <span className="cd-sub__value t-num">
                  <span key={subtotal}>{formatRand(subtotal)}</span>
                </span>
              </div>
              <CheckoutSlab blocked={blocked} lines={state.lines} subtotal={subtotal} />
              <Link className="cd-full" to="/cart">
                View full bag
              </Link>
            </footer>
          ) : null}
        </aside>
      </div>
      <div aria-live="polite" className="sr-only" role="status">
        {announcement}
      </div>
    </>
  );
}
