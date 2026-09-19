"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { getAllProducts } from "@/features/products/data";
import { formatCents } from "@/lib/money";
import type { CartItem } from "@/types/cart";
import { getAvailableInventory } from "@/lib/inventory-storage";

type CartItemProps = {
  item: CartItem;
};

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart();
  const product = getAllProducts().find((p) => p.id === item.productId);

  if (!product) {
    return null;
  }
  const availableInventory = getAvailableInventory(product);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(item.productId, item.size);
    } else {
      updateQuantity(item.productId, newQuantity, item.size);
    }
  };

  const handleRemove = () => {
    removeFromCart(item.productId, item.size);
  };

  return (
    <div className="flex gap-4 border-b border-border pb-6 sm:gap-6">
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#efe8dc] sm:h-32 sm:w-32"
      >
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 96px, 128px"
          className="object-cover"
        />
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-1">
          <Link
            href={`/products/${product.slug}`}
            className="font-semibold hover:text-brand"
          >
            {product.name}
          </Link>
          <p className="text-sm text-muted">{product.sellerName}</p>
          {item.size ? <p className="text-sm text-muted">Size: {item.size}</p> : null}
          <p className="mt-1 font-semibold">{formatCents(product.priceCents)}</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-white"
              aria-label="Decrease quantity"
            >
              <span className="text-sm">−</span>
            </button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={item.quantity >= availableInventory}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-white"
              aria-label="Increase quantity"
            >
              <span className="text-sm">+</span>
            </button>
          </div>

          <Button
            variant="ghost"
            onClick={handleRemove}
            className="h-auto px-0 py-0 text-sm text-muted hover:text-foreground"
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
