import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsCatalogPage } from "@/components/products/products-catalog-page";

export const metadata: Metadata = {
  title: "Shop products",
  description:
    "Browse ShopNest categories, search the catalog, and sort by price or rating.",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsCatalogPage />
    </Suspense>
  );
}
