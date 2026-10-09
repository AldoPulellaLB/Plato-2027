import { createFileRoute } from "@tanstack/react-router";

import { recordPaidSession, secret, verifyStripeSignature } from "@/lib/stripe.server";
import type { StripeSession } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = await secret("STRIPE_WEBHOOK_SECRET");
        if (!webhookSecret) return new Response("Webhook not configured", { status: 503 });
        const payload = await request.text();
        const valid = await verifyStripeSignature(payload, request.headers.get("stripe-signature"), webhookSecret);
        if (!valid) return new Response("Invalid signature", { status: 400 });

        let event: { type: string; data: { object: StripeSession } };
        try {
          event = JSON.parse(payload) as { type: string; data: { object: StripeSession } };
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }
        if (
          (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
          event.data?.object?.payment_status === "paid"
        ) {
          try {
            // Sessions that did not come from this shop's checkout (no cart metadata) are ignored.
            await recordPaidSession(event.data.object);
          } catch (error) {
            // A 500 makes Stripe retry the event later.
            console.error("Webhook order recording failed", error);
            return new Response("Could not record order", { status: 500 });
          }
        }
        return new Response("ok");
      },
    },
  },
});
