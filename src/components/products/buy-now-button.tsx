"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { getAllProducts } from "@/features/products/data";
import { getAvailableInventoryForSize } from "@/lib/inventory-storage";
import type { ProductSize } from "@/types/product";

type BuyNowButtonProps = {
  productId: string;
  sizes?: ProductSize[];
  disabled?: boolean;
  className?: string;
};

export function BuyNowButton({
  productId,
  sizes = [],
  disabled = false,
  className = "",
}: BuyNowButtonProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<ProductSize | "">("");
  const [isBuying, setIsBuying] = useState(false);
  const product = getAllProducts().find((item) => item.id === productId);
  const needsSize = sizes.length > 0;
  const sizeReady = !needsSize || Boolean(selectedSize);
  const isDisabled = disabled || !sizeReady || isBuying;

  const buyNow = () => {
    if (isDisabled || !product) return;
    setIsBuying(true);
    addToCart(productId, 1, selectedSize || undefined);
    window.setTimeout(() => router.push("/checkout"), 0);
  };

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {needsSize ? (
        <label className="sr-only" htmlFor={`buy-now-size-${productId}`}>
          Select size before buying
        </label>
      ) : null}
      {needsSize ? (
        <select
          id={`buy-now-size-${productId}`}
          value={selectedSize}
          onChange={(event) => setSelectedSize(event.target.value as ProductSize | "")}
          className="h-10 w-full rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground outline-none focus:ring-4 focus:ring-brand/20"
          aria-label="Select size before buying"
        >
          <option value="">Select size</option>
          {sizes.map((size) => {
            const unavailable = product ? getAvailableInventoryForSize(product, size) <= 0 : false;
            return (
              <option key={size} value={size} disabled={unavailable}>
                {size}{unavailable ? " (Out of stock)" : ""}
              </option>
            );
          })}
        </select>
      ) : null}
      <Button
        type="button"
        onClick={buyNow}
        disabled={isDisabled}
        className="w-full bg-accent text-black hover:bg-brand"
      >
        {isBuying ? "Opening checkout..." : "Buy now"}
      </Button>
    </div>
  );
}
