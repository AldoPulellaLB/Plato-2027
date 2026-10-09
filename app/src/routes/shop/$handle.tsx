import { createFileRoute, notFound } from "@tanstack/react-router";

import { ProductPage } from "@/components/commerce/product-page";
import { liveVariants, productByHandle } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";

function summary(product: Product) {
  const text = product.description.replace(/\s+/g, " ").trim();
  return text.length > 155 ? `${text.slice(0, 152).replace(/\s+\S*$/, "")}...` : text;
}

function structuredData(product: Product) {
  const live = liveVariants(product);
  const prices = (live.length ? live : product.variants).map((v) => v.price / 100);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images,
    description: product.description,
    brand: { "@type": "Brand", name: "Platō" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "ZAR",
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: live.length,
      availability: live.length ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  });
}

export const Route = createFileRoute("/shop/$handle")({
  loader: ({ params }) => {
    const product = productByHandle(params.handle);
    if (!product) throw notFound();
    return { handle: product.handle };
  },
  head: ({ params }) => {
    const product = productByHandle(params.handle);
    if (!product) return { meta: [{ title: "Page not found | PLATŌ Coffee" }] };
    const title = `${product.title.replace(/\s+-\s+/g, ", ")} | PLATŌ Coffee`;
    const description = summary(product);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:image", content: product.images[0] },
      ],
      scripts: [{ type: "application/ld+json", children: structuredData(product) }],
    };
  },
  component: ProductRoute,
});

function ProductRoute() {
  const { handle } = Route.useLoaderData();
  const product = productByHandle(handle);
  if (!product) return null;
  return <ProductPage product={product} />;
}
