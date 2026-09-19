"use client";

import { getAllProducts } from "@/features/products/data";
import { getAllReviews } from "@/lib/review-storage";

export function SellerReviewsSection({ sellerId }: { sellerId: string }) {
  const productIds = new Set(getAllProducts().filter((product) => product.sellerId === sellerId).map((product) => product.id));
  const reviews = getAllReviews().filter((review) => productIds.has(review.productId) && !review.isHidden);
  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Product Reviews ({reviews.length})</h2>
      {reviews.length === 0 ? <p className="mt-3 text-sm text-muted">No visible reviews for your products yet.</p> : (
        <div className="mt-4 space-y-3">
          {reviews.map((review) => {
            const product = getAllProducts().find((item) => item.id === review.productId);
            return <article key={review.id} className="rounded-xl border border-border bg-white p-4 text-sm"><p className="font-semibold">{product?.name || review.productId} · {review.rating}/5</p><p className="mt-1 text-muted">{review.customerName}</p><p className="mt-2">{review.text}</p></article>;
          })}
        </div>
      )}
    </section>
  );
}
