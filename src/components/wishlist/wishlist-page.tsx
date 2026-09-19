"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/container";
import { AddToCartButton } from "@/components/products/add-to-cart-button";
import { StarRating } from "@/components/products/star-rating";
import { useAuth } from "@/lib/auth-context";
import { getAllProducts } from "@/features/products/data";
import { getAvailableInventoryById } from "@/lib/inventory-storage";
import { formatCents } from "@/lib/money";
import { getReviewSummary } from "@/lib/review-storage";
import { getWishlistProductIds, removeFromWishlist, WISHLIST_UPDATED_EVENT } from "@/lib/wishlist-storage";

export function WishlistPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [productIds, setProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/signin");
      return;
    }
    const refresh = () => setProductIds(getWishlistProductIds(user.id));
    refresh();
    window.addEventListener(WISHLIST_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(WISHLIST_UPDATED_EVENT, refresh);
  }, [router, user]);

  if (!user) return null;

  const products = productIds
    .map((id) => getAllProducts().find((product) => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">My Wishlist</h1>
        {products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-muted">Your wishlist is empty.</p>
            <Link href="/products" className="mt-4 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Browse products</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const available = getAvailableInventoryById(product.id, product.inventory);
              const summary = getReviewSummary(product.id);
              const outOfStock = available <= 0;
              return (
                <article key={product.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <Link href={`/products/${product.slug}`} className="relative block aspect-[4/3] bg-[#efe8dc]">
                    <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                  </Link>
                  <div className="space-y-2 p-4">
                    <Link href={`/products/${product.slug}`} className="font-semibold hover:text-brand">{product.name}</Link>
                    <p className="text-lg font-semibold">{formatCents(product.priceCents)}</p>
                    <StarRating rating={summary.reviewCount ? summary.rating : product.rating} reviewCount={summary.reviewCount || product.reviewCount} />
                    <p className={`text-sm ${outOfStock ? "font-semibold text-red-600" : "text-muted"}`}>{outOfStock ? "Unavailable - Out of stock" : `${available} in stock`}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <AddToCartButton productId={product.id} disabled={outOfStock || Boolean(product.sizes?.length)} />
                      {product.sizes?.length ? <Link href={`/products/${product.slug}`} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand">Choose size</Link> : null}
                      <button type="button" onClick={() => removeFromWishlist(user.id, product.id)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand">Remove</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
