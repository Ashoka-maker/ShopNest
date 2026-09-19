"use client";

import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";
import { Container } from "@/components/layout/container";
import { useCart } from "@/lib/cart-context";
import { getAllProducts } from "@/features/products/data";
import Link from "next/link";

export function CartPage() {
  const { cart } = useCart();

  const cartItems = cart.items
    .map((item) => ({
      item,
      product: getAllProducts().find((p) => p.id === item.productId),
    }))
    .filter(({ product }) => product !== undefined);

  if (cartItems.length === 0) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your cart is empty
          </h1>
          <p className="mt-4 text-base text-muted">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Start Shopping
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Shopping Cart
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {cartItems.map(({ item, product }) => (
              <CartItem key={item.productId} item={item} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <CartSummary />
          </div>
        </div>
      </div>
    </Container>
  );
}
