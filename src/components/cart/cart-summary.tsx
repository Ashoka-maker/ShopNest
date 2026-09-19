"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { getAllProducts } from "@/features/products/data";
import { formatCents } from "@/lib/money";

export function CartSummary() {
  const { cart } = useCart();

  const subtotal = cart.items.reduce((total, item) => {
    const product = getAllProducts().find((p) => p.id === item.productId);
    if (!product) return total;
    return total + product.priceCents * item.quantity;
  }, 0);

  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Order Summary
      </h2>

      <div className="mt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal ({itemCount} items)</span>
          <span className="font-medium">{formatCents(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Shipping</span>
          <span className="font-medium">Calculated at checkout</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Tax</span>
          <span className="font-medium">Calculated at checkout</span>
        </div>
        <div className="border-t border-border pt-3">
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCents(subtotal)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link href="/checkout" className={`${buttonClassName("primary")} w-full`}>
          Proceed to Checkout
        </Link>
        <Link 
          href="/products" 
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
