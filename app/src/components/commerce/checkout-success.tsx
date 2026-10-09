// /checkout/success: confirms the Stripe session (which records the order),
// clears the bag, and says thank you.
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { PlatoSymbol } from "@/components/site/wordmark";
import { confirmOrder } from "@/lib/api/checkout.functions";
import { cart } from "@/lib/cart";
import { formatRand } from "@/lib/catalog";
import { CONTACT } from "@/lib/site";

import { WordsRise } from "./words-rise";
import "./checkout-success.css";

type SuccessState =
  | { kind: "loading" }
  | { kind: "paid"; name: string | null; email: string | null; total: number; signedIn: boolean }
  | { kind: "pending" }
  | { kind: "not_configured" }
  | { kind: "missing" };

export function CheckoutSuccess({ sessionId }: { sessionId?: string }) {
  const [state, setState] = useState<SuccessState>(sessionId ? { kind: "loading" } : { kind: "missing" });

  // The route keys this component by session id, so state starts fresh per session.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    confirmOrder({ data: { sessionId } })
      .then((result) => {
        if (cancelled) return;
        if (result.paid) {
          cart.clear();
          setState({ kind: "paid", name: result.name, email: result.email, total: result.total, signedIn: result.signedIn });
        } else {
          setState({ kind: result.reason === "not_configured" ? "not_configured" : "pending" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "pending" });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="cks" data-state={state.kind} id="main">
      <div className="cks-mark" aria-hidden="true">
        {state.kind === "paid" ? (
          <svg className="cks-check" fill="none" viewBox="0 0 120 120">
            <circle cx="60" cy="60" pathLength={1} r="56" stroke="currentColor" strokeWidth="1.5" />
            <path d="M38 61.5l15 15L83 46" pathLength={1} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        ) : (
          <PlatoSymbol className="cks-symbol" title="" />
        )}
      </div>

      <div aria-live="polite" className="cks-copy" key={state.kind}>
        {state.kind === "loading" ? (
          <>
            <p className="t-label cks-kicker">Order</p>
            <WordsRise className="cks-title" text="Confirming your order." />
            <p className="cks-body">This takes a moment. Please keep this page open.</p>
            <span aria-hidden="true" className="cks-progress" />
          </>
        ) : null}

        {state.kind === "paid" ? (
          <>
            <p className="t-label cks-kicker">Order confirmed</p>
            <WordsRise className="cks-title" italicFrom={2} text={state.name ? `Thank you, ${state.name}.` : "Thank you. Truly."} />
            <p className="cks-body">
              Your order of <strong className="t-num">{formatRand(state.total)}</strong> is confirmed.
              {state.email ? (
                <>
                  {" "}
                  We'll use <strong>{state.email}</strong> if we need to reach you about it.
                </>
              ) : null}
            </p>
            <div className="cks-actions">
              <Link className="cks-cta" to="/shop">
                <span>Keep browsing</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
              </Link>
              {state.signedIn ? (
                <Link className="cks-link" to="/account">
                  See your orders
                </Link>
              ) : (
                <Link className="cks-link" to="/stores">
                  Find your Platō
                </Link>
              )}
            </div>
          </>
        ) : null}

        {state.kind === "pending" ? (
          <>
            <p className="t-label cks-kicker">Almost there</p>
            <WordsRise className="cks-title" text="We're finishing up your order." />
            <p className="cks-body">
              If your payment went through, your order is safe with us. Anything unclear? Write to{" "}
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
            </p>
            <div className="cks-actions">
              <Link className="cks-cta" to="/cart">
                <span>Back to your bag</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
              </Link>
              <Link className="cks-link" to="/shop">
                Keep browsing
              </Link>
            </div>
          </>
        ) : null}

        {state.kind === "not_configured" ? (
          <>
            <p className="t-label cks-kicker">Checkout</p>
            <WordsRise className="cks-title" text="Payments aren't switched on yet." />
            <p className="cks-body">Your bag is saved on this device. Come back soon, or visit any Platō counter in the meantime.</p>
            <div className="cks-actions">
              <Link className="cks-cta" to="/cart">
                <span>Back to your bag</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
              </Link>
              <Link className="cks-link" to="/stores">
                Find your Platō
              </Link>
            </div>
          </>
        ) : null}

        {state.kind === "missing" ? (
          <>
            <p className="t-label cks-kicker">Checkout</p>
            <WordsRise className="cks-title" text="Nothing to confirm here." />
            <p className="cks-body">This page confirms an order after payment. If you were mid-checkout, your bag is still waiting.</p>
            <div className="cks-actions">
              <Link className="cks-cta" to="/cart">
                <span>Go to your bag</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
              </Link>
              <Link className="cks-link" to="/shop">
                Visit the shop
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
