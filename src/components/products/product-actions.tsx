"use client";

import { useState } from "react";
import { AddToCartButton } from "./add-to-cart-button";
import { buttonClassName } from "@/components/ui/button";
import Link from "next/link";
import type { ProductSize } from "@/types/product";
import { getAvailableInventoryById, getAvailableInventoryForSize } from "@/lib/inventory-storage";
import { getAllProducts } from "@/features/products/data";

type ProductActionsProps = {
  productId: string;
  categorySlug: string;
  categoryName: string;
  inventory: number;
  sizes?: ProductSize[];
};

export function ProductActions({
  productId,
  categorySlug,
  categoryName,
  inventory,
  sizes = [],
}: ProductActionsProps) {
  const [selectedSize, setSelectedSize] = useState<ProductSize | "">("");
  const availableInventory = getAvailableInventoryById(productId, inventory);
  const isOutOfStock = availableInventory <= 0;
  const needsSize = sizes.length > 0;
  const product = getAllProducts().find((item) => item.id === productId);

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      {needsSize ? (
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">Size</span>
          <select
            value={selectedSize}
            onChange={(event) => setSelectedSize(event.target.value as ProductSize | "")}
            className="h-11 rounded-full border border-border bg-white px-4"
            aria-label="Select size"
          >
            <option value="">Select size</option>
            {sizes.map((size) => <option key={size} value={size} disabled={product ? getAvailableInventoryForSize(product, size) <= 0 : false}>{size}{product && getAvailableInventoryForSize(product, size) <= 0 ? " (Out of stock)" : ""}</option>)}
          </select>
        </label>
      ) : null}
      <AddToCartButton
        productId={productId}
        size={selectedSize || undefined}
        disabled={isOutOfStock || (needsSize && !selectedSize)}
      />
      <Link href="/products" className={buttonClassName("secondary")}>
        Continue shopping
      </Link>
      <Link
        href={`/products?category=${categorySlug}`}
        className={buttonClassName("secondary")}
      >
        More in {categoryName}
      </Link>
    </div>
  );
}
