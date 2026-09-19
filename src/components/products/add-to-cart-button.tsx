"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import type { ProductSize } from "@/types/product";

type AddToCartButtonProps = {
  productId: string;
  disabled?: boolean;
  size?: ProductSize;
};

export function AddToCartButton({
  productId,
  disabled = false,
  size,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddToCart = () => {
    if (disabled || isAdding) return;

    setIsAdding(true);
    addToCart(productId, 1, size);

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
      disabled={disabled || isAdding}
      className="w-full sm:w-auto"
    >
      {isAdding ? "Adding..." : showSuccess ? "Added to cart!" : "Add to cart"}
    </Button>
  );
}
