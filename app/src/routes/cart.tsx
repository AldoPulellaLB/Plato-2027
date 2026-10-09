import { createFileRoute } from "@tanstack/react-router";

import { CartPage } from "@/components/commerce/cart-page";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your bag | PLATŌ Coffee" },
      { name: "description", content: "Review your Platō bag and check out securely." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});
