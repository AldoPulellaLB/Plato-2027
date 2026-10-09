import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ShopPage } from "@/components/commerce/shop-page";
import { CATEGORIES } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [Category, ...Category[]];

const searchSchema = z.object({
  c: z.enum(CATEGORY_IDS).optional().catch(undefined),
  s: z.enum(["featured", "price-asc", "price-desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/shop/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ c: search.c }),
  loader: ({ deps }) => ({ category: CATEGORIES.find((c) => c.id === deps.c) ?? null }),
  head: ({ loaderData }) => {
    const category = loaderData?.category;
    const title = category ? `${category.label} | Shop | PLATŌ Coffee` : "Shop | PLATŌ Coffee";
    const description = category
      ? category.blurb
      : "Shop Platō House Blend coffee, compostable pods, PerfectTed matcha, café drinks, Rocket and Eureka equipment, Academy courses and wear, delivered across South Africa.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: "/assets/brand/house-blend-250g.webp" },
      ],
    };
  },
  component: ShopRoute,
});

function ShopRoute() {
  const { c, s } = Route.useSearch();
  return <ShopPage category={c} sort={s ?? "featured"} />;
}
