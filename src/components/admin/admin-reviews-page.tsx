"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getAllProducts } from "@/features/products/data";
import { deleteReview, getAllReviews, REVIEWS_UPDATED_EVENT, setReviewHidden } from "@/lib/review-storage";
import type { Review } from "@/types/review";

export function AdminReviewsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    if (!user || !isAdmin) { router.push("/admin/login"); return; }
    const load = () => setReviews(getAllReviews());
    load();
    window.addEventListener(REVIEWS_UPDATED_EVENT, load);
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, load);
  }, [isAdmin, router, user]);
  if (!user || !isAdmin) return null;
  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Review Management</h1>
        <div className="mt-8 space-y-4">
          {reviews.length === 0 ? <p className="text-sm text-muted">No reviews found.</p> : reviews.map((review) => {
            const product = getAllProducts().find((item) => item.id === review.productId);
            return <article key={review.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{product?.name || review.productId}</p><p className="text-sm text-muted">{review.customerName} · {review.rating}/5</p></div><span className="text-sm">{review.isHidden ? "Hidden" : "Visible"}</span></div>
              <p className="mt-3 text-sm">{review.text}</p>
              <div className="mt-4 flex gap-3 text-sm"><button onClick={() => setReviewHidden(review.id, !review.isHidden)} className="font-semibold text-brand">{review.isHidden ? "Show" : "Hide"}</button><button onClick={() => deleteReview(review.id)} className="font-semibold text-red-600">Delete</button></div>
            </article>;
          })}
        </div>
      </div>
    </Container>
  );
}
