"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/components/products/product-card";
import { getAllProducts } from "@/features/products/data";
import { getReviewsForProduct, REVIEWS_UPDATED_EVENT } from "@/lib/review-storage";
import { getSellerById, SELLERS_UPDATED_EVENT } from "@/lib/seller-storage";
import { StarRating } from "@/components/products/star-rating";

export function SellerStorePage({ sellerId }: { sellerId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener(SELLERS_UPDATED_EVENT, refresh);
    window.addEventListener(REVIEWS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SELLERS_UPDATED_EVENT, refresh);
      window.removeEventListener(REVIEWS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const seller = getSellerById(sellerId);
  if (!seller) {
    return <Container className="py-20 text-center"><h1 className="font-display text-3xl font-semibold">Seller not found</h1><Link href="/products" className="mt-5 inline-flex text-brand">Back to shop</Link></Container>;
  }

  const products = getAllProducts().filter((product) => product.sellerId === seller.id);
  const reviews = products.flatMap((product) => getReviewsForProduct(product.id));
  const rating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {seller.logoUrl ? <img src={seller.logoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10 text-2xl font-semibold text-brand">{seller.storeName.charAt(0).toUpperCase()}</div>}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-semibold tracking-tight">{seller.storeName}</h1>
                {seller.verificationStatus === "verified" ? <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Verified Seller</span> : <span className="rounded-full bg-border px-3 py-1 text-xs font-semibold text-muted">{seller.verificationStatus === "rejected" ? "Verification rejected" : "Verification pending"}</span>}
              </div>
              <p className="mt-3 max-w-2xl text-muted">{seller.bio}</p>
              <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
                <span>Joined {new Date(seller.createdAt).toLocaleDateString()}</span>
                <span>{products.length} active products</span>
                <StarRating rating={rating} reviewCount={reviews.length} />
              </div>
              {seller.contactEmail || seller.contactPhone ? <p className="mt-3 text-sm text-muted">Contact: {seller.contactEmail || seller.contactPhone}</p> : null}
            </div>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="font-display text-2xl font-semibold">Products from {seller.storeName}</h2>
          {products.length ? <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-4 text-sm text-muted">This seller has no approved products yet.</p>}
        </div>
      </div>
    </Container>
  );
}
