"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CatalogControls } from "@/components/products/catalog-controls";
import { ProductGrid } from "@/components/products/product-grid";
import { SearchForm } from "@/components/products/search-form";
import { Container } from "@/components/layout/container";
import { parseSort, queryProducts } from "@/features/products/query";
import { loadSupabaseProducts, SUPABASE_PRODUCTS_UPDATED_EVENT } from "@/features/products/data";
import { SELLER_PRODUCTS_UPDATED_EVENT } from "@/lib/seller-storage";

export function ProductsCatalogPage() {
  const searchParams = useSearchParams();
  const [, setProductsRevision] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    const loadProducts = async () => {
      await loadSupabaseProducts();
      setIsLoaded(true);
    };
    void loadProducts();
    const refresh = () => setProductsRevision((revision) => revision + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener(SELLER_PRODUCTS_UPDATED_EVENT, refresh);
    window.addEventListener(SUPABASE_PRODUCTS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SELLER_PRODUCTS_UPDATED_EVENT, refresh);
      window.removeEventListener(SUPABASE_PRODUCTS_UPDATED_EVENT, refresh);
    };
  }, []);
  const query = {
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    sort: parseSort(searchParams.get("sort") ?? undefined),
    price: searchParams.get("price") ?? undefined,
    availability: searchParams.get("availability") ?? undefined,
  };
  const products = isLoaded ? queryProducts(query) : [];

  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-6 md:hidden">
        <SearchForm
          id="catalog-search"
          defaultQuery={query.q}
          defaultCategory={query.category}
          defaultSort={query.sort}
          defaultPrice={query.price}
          defaultAvailability={query.availability}
          placeholder="Search ShopNest"
        />
      </div>
      <CatalogControls query={query} resultCount={products.length} />
      <div className="mt-6">
        <ProductGrid products={products} />
      </div>
    </Container>
  );
}
