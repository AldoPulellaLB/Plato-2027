import { createFileRoute } from "@tanstack/react-router";

import { AcademyPage } from "@/components/pages/academy";

const TITLE = "The Academy | PLATŌ Coffee";
const DESCRIPTION =
  "The Academy by Platō: hands-on coffee courses from home brewing to training as a café barista, corporate team experiences and venue hire. See upcoming dates and book.";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: AcademyPage,
});
