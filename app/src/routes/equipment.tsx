import { createFileRoute } from "@tanstack/react-router";

import { EquipmentPage } from "@/components/pages/equipment";

const TITLE = "Equipment | PLATŌ Coffee";
const DESCRIPTION =
  "A café bar at home: Rocket espresso machines and Eureka grinders supplied by Platō, with specifications, finishes and prices in rand, and advice from the team.";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: EquipmentPage,
});
