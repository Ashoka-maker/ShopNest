"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import type { ProductOptionValue } from "@/types/product";

type AddToCartButtonProps = {
  productId: string;
  disabled?: boolean;
  size?: ProductOptionValue;
  variantId?: string;
  requiresOption?: boolean;
  className?: string;
};

export function AddToCartButton({
  productId,
  disabled = false,
  size,
  variantId,
  requiresOption = false,
  className,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = () => {
    if (disabled || isAdding) return;

    setIsAdding(true);
    addToCart(productId, 1, size, variantId);

    // Show success feedback
    setTimeout(() => {
      setIsAdding(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 500);
  };

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled || isAdding || (requiresOption && !size)}
      className={`w-full sm:w-auto ${className ?? ""}`}
    >
      {isAdding ? "Adding..." : showSuccess ? "Added to cart!" : "Add to cart"}
    </Button>
  );
}
