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
  const [loadError, setLoadError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  useEffect(() => {
    let active = true;
    setIsLoaded(false);
    setLoadError(false);
    const loadProducts = async () => {
      try {
        await loadSupabaseProducts();
      } catch (error) {
        console.error("Unable to load the public product catalog:", error);
        if (active) setLoadError(true);
      } finally {
        if (active) setIsLoaded(true);
      }
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
      active = false;
    };
  }, [reloadCount]);
  const query = {
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    sort: parseSort(searchParams.get("sort") ?? undefined),
    price: searchParams.get("price") ?? undefined,
    availability: searchParams.get("availability") ?? undefined,
  };
  const products = isLoaded && !loadError ? queryProducts(query) : [];

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
      <CatalogControls
        query={query}
        resultCount={isLoaded && !loadError ? products.length : null}
        loadError={loadError}
      />
      <div className="mt-6">
        {loadError ? (
          <div role="alert" className="rounded-2xl border border-border bg-surface px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">Products could not be loaded</h2>
            <p className="mt-2 text-sm text-muted">Please check your connection and try again.</p>
            <button
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Try again
            </button>
          </div>
        ) : isLoaded ? (
          <ProductGrid products={products} />
        ) : null}
      </div>
    </Container>
  );
}
