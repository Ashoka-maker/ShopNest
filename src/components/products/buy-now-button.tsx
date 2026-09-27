"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { getAllProducts } from "@/features/products/data";
import type { ProductOptionValue } from "@/types/product";

type BuyNowButtonProps = {
  productId: string;
  size?: ProductOptionValue;
  variantId?: string;
  requiresOption?: boolean;
  disabled?: boolean;
  className?: string;
};

export function BuyNowButton({
  productId,
  size,
  variantId,
  requiresOption = false,
  disabled = false,
  className = "",
}: BuyNowButtonProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [isBuying, setIsBuying] = useState(false);
  const product = getAllProducts().find((item) => item.id === productId);
  const isDisabled = disabled || (requiresOption && !size) || isBuying;

  const buyNow = () => {
    if (isDisabled || !product) return;
    setIsBuying(true);
    addToCart(productId, 1, size, variantId);
    window.setTimeout(() => router.push("/checkout"), 0);
  };

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
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
