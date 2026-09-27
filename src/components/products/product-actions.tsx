"use client";

import { useState } from "react";
import { AddToCartButton } from "./add-to-cart-button";
import { buttonClassName } from "@/components/ui/button";
import Link from "next/link";
import type { Product } from "@/types/product";
import { getAvailableInventory } from "@/lib/inventory-storage";
import { getProductOptionType, getProductOptionTypeLabel, getProductOptions } from "@/lib/product-options";

type ProductActionsProps = {
  productId: string;
  categorySlug: string;
  categoryName: string;
  product: Product;
};

export function ProductActions({
  productId,
  categorySlug,
  categoryName,
  product,
}: ProductActionsProps) {
  const [selectedOptionValue, setSelectedOptionValue] = useState("");
  const options = getProductOptions(product);
  const optionType = getProductOptionType(product);
  const selectedOption = options.find((option) => option.value === selectedOptionValue);
  const availableInventory = getAvailableInventory(product);
  const isOutOfStock = availableInventory <= 0;

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      {options.length ? (
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">{getProductOptionTypeLabel(optionType)}</span>
          <select
            value={selectedOptionValue}
            onChange={(event) => setSelectedOptionValue(event.target.value)}
            className="h-11 rounded-full border border-border bg-white px-4"
            aria-label={`Select ${getProductOptionTypeLabel(optionType)}`}
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
      <AddToCartButton
        productId={productId}
        size={selectedOption?.value}
        variantId={selectedOption?.variantId}
        requiresOption={options.length > 0}
        disabled={isOutOfStock || Boolean(selectedOption && selectedOption.inventory <= 0)}
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
