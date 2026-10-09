import { createFileRoute } from "@tanstack/react-router";

import { OurStoryPage } from "@/components/pages/our-story";
import { STORE_COUNT } from "@/lib/site";

const TITLE = "Our Story | PLATŌ Coffee";
const DESCRIPTION = `How Platō grew from one café in Irene in 2019 to about ${STORE_COUNT} locations across South Africa, and London: our mission, our vision, our own roastery, bakery and equipment, and the founders behind it.`;

export const Route = createFileRoute("/our-story")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: OurStoryPage,
});
