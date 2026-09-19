import Link from "next/link";
import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/types/product";
import { getAllProducts } from "@/features/products/data";

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <h2 className="text-lg font-semibold">No products match</h2>
        <p className="mt-2 text-sm text-muted">
          Try a different search, category, or sort option.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex text-sm font-semibold text-brand hover:text-brand-dark"
        >
          Clear filters
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
