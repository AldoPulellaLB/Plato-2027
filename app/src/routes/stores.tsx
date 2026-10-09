import { createFileRoute } from "@tanstack/react-router";

import { StoresPage } from "@/components/pages/stores";

const TITLE = "Find your Platō | PLATŌ Coffee";
const DESCRIPTION =
  "Find a Platō café near you: search by name, suburb or city across Gauteng, the Western Cape, Mpumalanga, Limpopo and North West, with hours and directions. Over 140 locations, and London.";

export const Route = createFileRoute("/stores")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StoresPage,
});
