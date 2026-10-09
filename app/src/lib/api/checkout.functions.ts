import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { findVariant, isLiveVariant } from "../catalog";
import { fetchStripeSession, recordPaidSession, stripeRequest } from "../stripe.server";

const linesSchema = z.object({
  lines: z
    .array(z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(40),
});

type CheckoutResult = { ok: true; url: string } | { ok: false; message: string };

// Prices always come from the server-side catalogue, never from the client.
export const createCheckout = createServerFn({ method: "POST" })
  .validator(linesSchema)
  .handler(async ({ data }): Promise<CheckoutResult> => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { ok: false, message: "Online payments are being switched on. Please check back very soon." };
    }
    const origin = new URL(getRequest().url).origin;
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${origin}/shop`);
    form.set("shipping_address_collection[allowed_countries][0]", "ZA");
    form.set("phone_number_collection[enabled]", "true");
    form.set("billing_address_collection", "auto");

    const compact: string[] = [];
    let index = 0;
    for (const line of data.lines) {
      const found = findVariant(line.variantId);
      if (!found) return { ok: false, message: "An item in your bag is no longer available." };
      const { product, variant } = found;
      if (!isLiveVariant(variant)) {
        return { ok: false, message: `${product.title} (${variant.title}) has already taken place. Please remove it from your bag.` };
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

    const session = await stripeRequest<{ url?: string }>("/v1/checkout/sessions", form);
    if (!session?.url) {
      return { ok: false, message: "We couldn't open checkout. Please try again." };
    }
    return { ok: true, url: session.url };
  });

export const confirmOrder = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_]+$/) }))
  .handler(async ({ data }) => {
    const session = await fetchStripeSession(data.sessionId);
    if (!session || session.payment_status !== "paid") {
      return { paid: false as const };
    }
    await recordPaidSession(session);
    return {
      paid: true as const,
      name: session.customer_details?.name?.split(" ")[0] ?? null,
      email: session.customer_details?.email ?? null,
      total: session.amount_total ?? 0,
    };
  });
