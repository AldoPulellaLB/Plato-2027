// Signed-in account view: greeting, order history, details, sign out.
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, LogOut } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";

import { signOut } from "@/lib/api/account.functions";
import type { OrderSummary } from "@/lib/api/account.functions";
import { formatRand } from "@/lib/catalog";
import { CONTACT } from "@/lib/site";

import { announce } from "../announcer";
import { formatMonthYear, formatOrderDate, prettyVariant } from "../format";
import { useRevealOnce } from "../motion";
import { WordsRise } from "../words-rise";

interface DashboardProps {
  customer: { name: string; email: string; since: string };
  orders: OrderSummary[];
}

export function AccountDashboard({ customer, orders }: DashboardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = customer.name.split(" ")[0] || customer.name;

  const leave = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signOut();
      announce("Signed out.");
      await router.invalidate();
    } catch {
      setError("We couldn't sign you out just now. Please try again.");
      setBusy(false);
    }
  };

  return (
    <main className="acct acct--in" id="main">
      <header className="acct-hero">
        <p className="t-label acct-kicker">Your account</p>
        <WordsRise as="h1" className="acct-greet" italicFrom={2} text={`Welcome back, ${first}.`} />
        <p className="acct-since">A regular since {formatMonthYear(customer.since)}.</p>
      </header>

      <div className="acct-board">
        <section aria-labelledby="acct-orders-title" className="acct-orders">
          <div className="acct-orders__head">
            <h2 className="acct-h2" id="acct-orders-title">
              Orders
            </h2>
            <span className="t-label t-num acct-orders__count">{orders.length}</span>
          </div>
          {orders.length ? (
            <ol className="acct-order-list">
              {orders.map((order, i) => (
                <OrderRow key={order.id} order={order} slot={Math.min(i, 4)} />
              ))}
            </ol>
          ) : (
            <div className="acct-empty">
              <p className="acct-empty__title">No orders yet.</p>
              <p className="acct-empty__body">Orders you place while signed in will appear here, with everything in them.</p>
              <Link className="acct-empty__cta" to="/shop">
                <span>Shop the counter</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
              </Link>
            </div>
          )}
        </section>

        <aside aria-labelledby="acct-details-title" className="acct-details">
          <h2 className="t-label acct-details__title" id="acct-details-title">
            Details
          </h2>
          <dl className="acct-dl">
            <div>
              <dt>Name</dt>
              <dd>{customer.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{customer.email}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatOrderDate(customer.since)}</dd>
            </div>
          </dl>
          <p className="acct-small">
            To change your details, write to <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Account details")}`}>{CONTACT.email}</a>.
          </p>
          <button aria-busy={busy || undefined} className="acct-signout" data-busy={busy || undefined} onClick={leave} type="button">
            <LogOut aria-hidden="true" size={18} strokeWidth={1.5} />
            <span>{busy ? "Signing out" : "Sign out"}</span>
          </button>
          {error ? (
            <p className="acct-form-error" data-tone="error" role="alert">
              {error}
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function OrderRow({ order, slot }: { order: OrderSummary; slot: number }) {
  const { ref } = useRevealOnce<HTMLLIElement>(slot * 80);
  const items = order.lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <li className="acct-order" ref={ref} style={{ "--slot": slot } as CSSProperties}>
      <div className="acct-order__head">
        <p className="acct-order__no">
          <span className="t-label">Order</span>
          <span className="t-num">{String(order.id).padStart(4, "0")}</span>
        </p>
        <p className="acct-order__date">{formatOrderDate(order.createdAt)}</p>
        <p className="acct-order__status t-label" data-status={order.status}>
          {order.status === "paid" ? "Paid" : order.status}
        </p>
        <p className="acct-order__total t-num">
          <span className="sr-only">Total </span>
          {formatRand(order.total)}
        </p>
      </div>
      <ul aria-label={`${items} ${items === 1 ? "item" : "items"}`} className="acct-order__lines">
        {order.lines.map((line, i) => (
          <li className="acct-line-item" key={`${line.handle ?? "gone"}-${i}`}>
            {line.image ? <img alt="" decoding="async" height={96} loading="lazy" src={line.image} width={96} /> : <span className="acct-line-item__ph" />}
            <span className="acct-line-item__text">
              <span className="acct-line-item__qty t-num">{line.quantity} ×</span>{" "}
              {line.handle ? (
                <Link params={{ handle: line.handle }} to="/shop/$handle">
                  {line.title}
                </Link>
              ) : (
                line.title
              )}
              {line.variant ? <span className="acct-line-item__variant">{prettyVariant(line.variant)}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}
