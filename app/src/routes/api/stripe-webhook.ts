import { createFileRoute } from "@tanstack/react-router";

import { recordPaidSession, verifyStripeSignature } from "@/lib/stripe.server";
import type { StripeSession } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 503 });
        const payload = await request.text();
        const valid = await verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret);
        if (!valid) return new Response("Invalid signature", { status: 400 });

        const event = JSON.parse(payload) as { type: string; data: { object: StripeSession } };
        if (
          (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
          event.data.object.payment_status === "paid"
        ) {
          await recordPaidSession(event.data.object);
        }
        return new Response("ok");
      },
    },
  },
});
