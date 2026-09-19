"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/products/star-rating";
import { CATEGORIES } from "@/lib/constants";
import { discountPercent, formatCents } from "@/lib/money";
import type { Product } from "@/types/product";
import { getAvailableInventoryById } from "@/lib/inventory-storage";
import { getReviewSummary, REVIEWS_UPDATED_EVENT } from "@/lib/review-storage";
import { WishlistButton } from "@/components/products/wishlist-button";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const availableInventory = getAvailableInventoryById(product.id, product.inventory);
  const off = discountPercent(product.priceCents, product.compareAtPriceCents);
  const category = CATEGORIES.find((item) => item.slug === product.category);
  const [reviewSummary, setReviewSummary] = useState(() => getReviewSummary(product.id));
  useEffect(() => {
    const refresh = () => setReviewSummary(getReviewSummary(product.id));
    window.addEventListener(REVIEWS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, refresh);
  }, [product.id]);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#efe8dc]"
      >
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {off > 0 ? (
          <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">
            {off}% off
          </span>
        ) : null}
        {availableInventory <= 0 ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
            Out of Stock
          </span>
        ) : null}
      </Link>
      <WishlistButton productId={product.id} className="absolute top-3 right-3 z-10" />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {category?.name}
        </p>
        <h2 className="text-base leading-snug font-semibold">
          <Link
            href={`/products/${product.slug}`}
            className="hover:text-brand"
          >
            {product.name}
          </Link>
        </h2>
        <StarRating rating={reviewSummary.reviewCount ? reviewSummary.rating : product.rating} reviewCount={reviewSummary.reviewCount || product.reviewCount} />
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-1">
          <span className="text-lg font-semibold">
            {formatCents(product.priceCents)}
          </span>
          {off > 0 && product.compareAtPriceCents ? (
            <span className="text-sm text-muted line-through">
              {formatCents(product.compareAtPriceCents)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
