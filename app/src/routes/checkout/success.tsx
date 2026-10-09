import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CheckoutSuccess } from "@/components/commerce/checkout-success";

export const Route = createFileRoute("/checkout/success")({
  validateSearch: z.object({ session_id: z.string().max(255).optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Thank you | PLATŌ Coffee" },
      { name: "description", content: "Your Platō order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessRoute,
});

function SuccessRoute() {
  const { session_id } = Route.useSearch();
  return <CheckoutSuccess key={session_id ?? "none"} sessionId={session_id} />;
}
