// Checkout request rules, shared by the server function and the checkout slab (client safe).
import { z } from "zod";

import { findVariant } from "../catalog";

export const MAX_CHECKOUT_LINES = 40;
export const MAX_LINE_QUANTITY = 99;

/** Stripe's ceiling for one payment: eight digits in the smallest unit (R999,999.99). */
export const STRIPE_MAX_AMOUNT = 99_999_999;

export const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]+$/;

/** sessionStorage key: the Stripe session this device opened, so only its own success page clears the bag. */
export const CHECKOUT_SESSION_KEY = "plato.checkout.session";

export const linesSchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_CHECKOUT_LINES),
});

export type CheckoutLines = z.infer<typeof linesSchema>["lines"];

/** True when at least one line is a physical product (anything but an Academy place). */
export function needsDelivery(lines: { variantId: string }[]) {
  return lines.some((line) => findVariant(line.variantId)?.product.category !== "academy");
}
