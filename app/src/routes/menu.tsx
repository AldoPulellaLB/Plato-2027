import { createFileRoute } from "@tanstack/react-router";

import { MenuPage } from "@/components/pages/menu-board";

const TITLE = "Our Menu | PLATŌ Coffee";
const DESCRIPTION =
  "The full Platō in-store menu: signature drinks built on ristretto, classics, chai and chocolate, ceremonial grade matcha, Freezos and sodas, with small, medium and large prices in rand.";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: MenuPage,
});
