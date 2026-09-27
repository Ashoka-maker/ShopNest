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
import { SellerBadge } from "@/components/seller/seller-badge";
import { AddToCartButton } from "@/components/products/add-to-cart-button";
import { BuyNowButton } from "@/components/products/buy-now-button";
import { getProductOptionType, getProductOptionTypeLabel, getProductOptions } from "@/lib/product-options";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const availableInventory = getAvailableInventoryById(product);
  const options = getProductOptions(product);
  const optionType = getProductOptionType(product);
  const off = discountPercent(product.priceCents, product.compareAtPriceCents);
  const category = CATEGORIES.find((item) => item.slug === product.category);
  const [selectedOptionValue, setSelectedOptionValue] = useState("");
  const selectedOption = options.find((option) => option.value === selectedOptionValue);
  const [reviewSummary, setReviewSummary] = useState(() => getReviewSummary(product.id));
  useEffect(() => {
    const refresh = () => setReviewSummary(getReviewSummary(product.id));
    window.addEventListener(REVIEWS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, refresh);
  }, [product.id]);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-[#edf3ef]"
      >
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {off > 0 ? (
          <span className="absolute top-3 left-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white shadow-sm">
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

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {category?.name}
        </p>
        <p className="text-xs"><SellerBadge sellerId={product.sellerId} sellerName={product.sellerName} /></p>
        <h2 className="text-base leading-snug font-semibold">
          <Link
            href={`/products/${product.slug}`}
            className="hover:text-brand"
          >
            {product.name}
          </Link>
        </h2>
        <StarRating rating={reviewSummary.reviewCount ? reviewSummary.rating : product.rating} reviewCount={reviewSummary.reviewCount || product.reviewCount} />
        <div className="mt-auto flex flex-wrap items-baseline gap-2 border-t border-border/70 pt-3">
          <span className="text-xl font-bold tracking-tight">
            {formatCents(product.priceCents)}
          </span>
          {off > 0 && product.compareAtPriceCents ? (
            <span className="text-sm text-muted line-through">
              {formatCents(product.compareAtPriceCents)}
            </span>
          ) : null}
        </div>
        {options.length ? (
          <label className="mt-2 grid gap-1 text-xs font-medium text-muted">
            {getProductOptionTypeLabel(optionType)}
            <select
              value={selectedOptionValue}
              onChange={(event) => setSelectedOptionValue(event.target.value)}
              aria-label={`Select ${getProductOptionTypeLabel(optionType)} for ${product.name}`}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">Select {getProductOptionTypeLabel(optionType).toLowerCase()}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.inventory <= 0}>
                  {option.value}{option.inventory <= 0 ? " (Out of stock)" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <AddToCartButton productId={product.id} size={selectedOption?.value} variantId={selectedOption?.variantId} requiresOption={options.length > 0} disabled={availableInventory <= 0 || Boolean(selectedOption && selectedOption.inventory <= 0)} />
          <BuyNowButton productId={product.id} size={selectedOption?.value} variantId={selectedOption?.variantId} requiresOption={options.length > 0} disabled={availableInventory <= 0 || Boolean(selectedOption && selectedOption.inventory <= 0)} />
        </div>
      </div>
    </article>
  );
}
