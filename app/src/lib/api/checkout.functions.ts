import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { findVariant, isLiveVariant } from "../catalog";
import { currentCustomerSafe } from "../auth.server";
import { fetchStripeSession, recordPaidSession, stripeConfigured, stripeRequest } from "../stripe.server";

const linesSchema = z.object({
  lines: z
    .array(z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(40),
});

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; code: "not_configured" | "unavailable_item" | "error"; message: string };

// Prices always come from the server-side catalogue, never from the client.
export const createCheckout = createServerFn({ method: "POST" })
  .validator(linesSchema)
  .handler(async ({ data }): Promise<CheckoutResult> => {
    if (!stripeConfigured()) {
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
    form.set("shipping_address_collection[allowed_countries][0]", "ZA");
    form.set("phone_number_collection[enabled]", "true");
    form.set("billing_address_collection", "auto");
    form.set("locale", "en");

    const compact: string[] = [];
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
          message: `${product.title} on ${variant.title.split(" | ")[0]} has already taken place. Please remove it from your bag.`,
        };
      }
      const name = variant.title === "Default Title" ? product.title : `${product.title} (${variant.title})`;
      form.set(`line_items[${index}][quantity]`, String(line.quantity));
      form.set(`line_items[${index}][price_data][currency]`, "zar");
      form.set(`line_items[${index}][price_data][unit_amount]`, String(variant.price));
      form.set(`line_items[${index}][price_data][product_data][name]`, name);
      form.set(`line_items[${index}][price_data][product_data][images][0]`, `${origin}${product.images[0]}`);
      compact.push(`${variant.id}:${line.quantity}`);
      index += 1;
    }
    form.set("metadata[cart]", compact.join(",").slice(0, 500));

    // Signed-in customers: prefill their email and link the order to the account.
    const customer = await currentCustomerSafe();
    if (customer) {
      form.set("customer_email", customer.email);
      form.set("client_reference_id", String(customer.id));
      form.set("metadata[customer_id]", String(customer.id));
    }

    const session = await stripeRequest<{ url?: string }>("/v1/checkout/sessions", form);
    if (!session?.url) {
      return { ok: false, code: "error", message: "We couldn't open checkout just now. Please try again in a moment." };
    }
    return { ok: true, url: session.url };
  });

export type ConfirmResult =
  | { paid: true; name: string | null; email: string | null; total: number; signedIn: boolean }
  | { paid: false; reason: "not_configured" | "pending" };

export const confirmOrder = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().max(255).regex(/^cs_[A-Za-z0-9_]+$/) }))
  .handler(async ({ data }): Promise<ConfirmResult> => {
    if (!stripeConfigured()) return { paid: false, reason: "not_configured" };
    const session = await fetchStripeSession(data.sessionId);
    if (!session || session.payment_status !== "paid") {
      return { paid: false, reason: "pending" };
    }
    try {
      await recordPaidSession(session);
    } catch (error) {
      // The webhook records it too; the customer still sees their confirmation.
      console.error("Recording the order failed", error);
    }
    const customer = await currentCustomerSafe();
    return {
      paid: true,
      name: session.customer_details?.name?.split(" ")[0] ?? null,
      email: session.customer_details?.email ?? null,
      total: session.amount_total ?? 0,
      signedIn: Boolean(customer),
    };
  });
