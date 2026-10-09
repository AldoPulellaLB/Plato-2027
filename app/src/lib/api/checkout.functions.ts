import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { findVariant, isLiveVariant } from "../catalog";
import { currentCustomerSafe } from "../auth.server";
import {
  cartFromMetadata,
  cartToMetadata,
  fetchStripeSession,
  findPaidOrder,
  recordPaidSession,
  secret,
  sessionCustomerId,
  stripeConfigured,
  stripeRequest,
} from "../stripe.server";
import { SESSION_ID_PATTERN, STRIPE_MAX_AMOUNT, linesSchema } from "./checkout.rules";

export type CheckoutResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; code: "not_configured" | "unavailable_item" | "error"; message: string };

// Prices always come from the server-side catalogue, never from the client.
export const createCheckout = createServerFn({ method: "POST" })
  .validator(linesSchema)
  .handler(async ({ data }): Promise<CheckoutResult> => {
    if (!(await stripeConfigured())) {
      return {
        ok: false,
        code: "not_configured",
        message: "Online payments are being switched on. Your bag is saved on this device, so nothing is lost.",
      };
    }
    const origin = new URL(getRequest().url).origin;
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${origin}/cart`);
    form.set("phone_number_collection[enabled]", "true");
    form.set("billing_address_collection", "auto");
    form.set("locale", "en");

    const compact: string[] = [];
    let total = 0;
    let physical = false;
    let index = 0;
    for (const line of data.lines) {
      const found = findVariant(line.variantId);
      if (!found) {
        return { ok: false, code: "unavailable_item", message: "An item in your bag is no longer available. Please remove it and try again." };
      }
      const { product, variant } = found;
      if (!isLiveVariant(variant)) {
        return {
          ok: false,
          code: "unavailable_item",
          message: `${product.title} on ${variant.title.split(" | ")[0]} has already started. Please remove it from your bag.`,
        };
      }
      total += variant.price * line.quantity;
      if (product.category !== "academy") physical = true;
      const name = variant.title === "Default Title" ? product.title : `${product.title} (${variant.title})`;
      form.set(`line_items[${index}][quantity]`, String(line.quantity));
      form.set(`line_items[${index}][price_data][currency]`, "zar");
      form.set(`line_items[${index}][price_data][unit_amount]`, String(variant.price));
      form.set(`line_items[${index}][price_data][product_data][name]`, name);
      form.set(`line_items[${index}][price_data][product_data][images][0]`, `${origin}${product.images[0]}`);
      compact.push(`${variant.id}:${line.quantity}`);
      index += 1;
    }

    if (total > STRIPE_MAX_AMOUNT) {
      return {
        ok: false,
        code: "unavailable_item",
        message: "Your bag is over our online order limit. Please reduce the quantities or contact us to order.",
      };
    }

    // Academy places need no delivery address. Physical items do; when a Stripe
    // shipping rate is configured, Checkout adds it to the order.
    if (physical) {
      form.set("shipping_address_collection[allowed_countries][0]", "ZA");
      const shippingRate = await secret("STRIPE_SHIPPING_RATE_ID");
      if (shippingRate) form.set("shipping_options[0][shipping_rate]", shippingRate);
    }

    for (const [key, value] of Object.entries(cartToMetadata(compact))) form.set(`metadata[${key}]`, value);

    // Signed-in customers: prefill their email and link the order to the account.
    const customer = await currentCustomerSafe();
    if (customer) {
      form.set("customer_email", customer.email);
      form.set("client_reference_id", String(customer.id));
      form.set("metadata[customer_id]", String(customer.id));
    }

    const session = await stripeRequest<{ id?: string; url?: string }>("/v1/checkout/sessions", form);
    if (!session?.url || !session.id) {
      return { ok: false, code: "error", message: "We couldn't open checkout just now. Please try again in a moment." };
    }
    return { ok: true, url: session.url, sessionId: session.id };
  });

export type ConfirmResult =
  | { paid: true; name: string | null; email: string | null; total: number; signedIn: boolean }
  | { paid: false; reason: "not_configured" | "pending" | "unknown" };

function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || null;
}

// The session id travels in the success URL, so it is not a secret: the payer's
// name and email are only returned to the signed-in customer who placed the order.
export const confirmOrder = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().max(255).regex(SESSION_ID_PATTERN) }))
  .handler(async ({ data }): Promise<ConfirmResult> => {
    if (!(await stripeConfigured())) return { paid: false, reason: "not_configured" };
    const customer = await currentCustomerSafe();
    const owns = (customerId: number | null) => customer !== null && customerId !== null && customerId === customer.id;

    // Already recorded (by the webhook or an earlier visit): no need to ask Stripe.
    const recorded = await findPaidOrder(data.sessionId);
    if (recorded) {
      const mine = owns(recorded.customerId);
      return {
        paid: true,
        name: mine ? firstName(recorded.name) : null,
        email: mine ? recorded.email : null,
        total: recorded.total,
        signedIn: Boolean(customer),
      };
    }

    const session = await fetchStripeSession(data.sessionId);
    if (!session) return { paid: false, reason: "pending" };
    // Only sessions created by this shop's checkout carry the cart.
    if (!cartFromMetadata(session.metadata)) return { paid: false, reason: "unknown" };
    if (session.payment_status !== "paid") return { paid: false, reason: "pending" };
    try {
      await recordPaidSession(session);
    } catch (error) {
      // The webhook records it too; the customer still sees their confirmation.
      console.error("Recording the order failed", error);
    }
    const mine = owns(sessionCustomerId(session));
    return {
      paid: true,
      name: mine ? firstName(session.customer_details?.name) : null,
      email: mine ? (session.customer_details?.email ?? null) : null,
      total: session.amount_total ?? 0,
      signedIn: Boolean(customer),
    };
  });
