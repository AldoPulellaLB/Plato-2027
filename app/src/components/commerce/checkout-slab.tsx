// CheckoutSlab: full-width green slab, the label rolls on hover. Calls the
// createCheckout server function and hands over to Stripe Checkout.
import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { RollText } from "@/components/site/text/reveal";
import { createCheckout } from "@/lib/api/checkout.functions";
import { formatRand } from "@/lib/catalog";
import { CONTACT } from "@/lib/site";

import "./checkout-slab.css";

type SlabState = { kind: "idle" } | { kind: "busy" } | { kind: "info" | "error"; message: string };

interface CheckoutSlabProps {
  lines: { variantId: string; quantity: number }[];
  subtotal: number;
  /** Blocks checkout (e.g. a line for an Academy date that has passed). */
  blocked?: string | null;
}

export function CheckoutSlab({ lines, subtotal, blocked = null }: CheckoutSlabProps) {
  const [state, setState] = useState<SlabState>({ kind: "idle" });
  const messageId = useId();
  const busy = state.kind === "busy";
  const unavailable = lines.length === 0 || Boolean(blocked);

  // Coming back from Stripe with the browser's back button restores this page
  // from the back/forward cache: release the busy state.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setState({ kind: "idle" });
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const start = async () => {
    if (busy || unavailable) return;
    setState({ kind: "busy" });
    try {
      const result = await createCheckout({ data: { lines: lines.map(({ variantId, quantity }) => ({ variantId, quantity })) } });
      if (result.ok) {
        window.location.assign(result.url);
        return;
      }
      setState({ kind: result.code === "not_configured" ? "info" : "error", message: result.message });
    } catch {
      setState({ kind: "error", message: "We couldn't reach checkout. Check your connection and try again." });
    }
  };

  const message = blocked ?? (state.kind === "info" || state.kind === "error" ? state.message : null);
  const tone = blocked ? "error" : state.kind === "info" ? "info" : "error";

  return (
    <div className="cos">
      <button
        aria-busy={busy || undefined}
        aria-describedby={message ? messageId : undefined}
        aria-disabled={busy || unavailable || undefined}
        className="cos-slab"
        data-busy={busy || undefined}
        data-unavailable={unavailable || undefined}
        onClick={start}
        type="button"
      >
        <span className="cos-slab__label">
          {busy ? (
            <span className="cos-slab__busy">Opening checkout</span>
          ) : (
            <RollText>Checkout</RollText>
          )}
        </span>
        <span className="cos-slab__total t-num">{formatRand(subtotal)}</span>
        <span aria-hidden="true" className="cos-slab__arrow">
          <ArrowRight size={20} strokeWidth={1.5} />
        </span>
        <span aria-hidden="true" className="cos-slab__progress" />
      </button>

      <div aria-live="polite" className="cos-live">
        {message ? (
          <div className="cos-msg" data-tone={tone} id={messageId}>
            <p>{message}</p>
            {state.kind === "info" && !blocked ? (
              <p className="cos-msg__links">
                <Link to="/shop">Keep browsing</Link>
                <span aria-hidden="true">or</span>
                <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Ordering from the online shop")}`}>email {CONTACT.email}</a>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="cos-secure">
        <Lock aria-hidden="true" size={14} strokeWidth={1.5} />
        Secure checkout by Stripe. Delivery is calculated there.
      </p>
    </div>
  );
}
