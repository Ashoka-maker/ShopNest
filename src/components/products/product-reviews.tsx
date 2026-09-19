"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getReviewableOrders, getReviewsForProduct, REVIEWS_UPDATED_EVENT, saveReview, updateReview, deleteReview } from "@/lib/review-storage";
import type { Review } from "@/types/review";
import { StarRating } from "./star-rating";

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [orderId, setOrderId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = () => setReviews(getReviewsForProduct(productId));
  useEffect(() => {
    load();
    window.addEventListener(REVIEWS_UPDATED_EVENT, load);
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, load);
  }, [productId]);

  const reviewableOrders = useMemo(
    () => (user ? getReviewableOrders(user.id, productId) : []),
    [user, productId, reviews],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !orderId || !text.trim()) return;
    if (editingId) {
      updateReview(editingId, user.id, { rating, text: text.trim() });
      setMessage("Review updated.");
    } else {
      saveReview({ productId, customerId: user.id, customerName: user.name, orderId, rating, text: text.trim() });
      setMessage("Review submitted.");
    }
    setEditingId(null);
    setOrderId("");
    setText("");
    setRating(5);
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setRating(review.rating);
    setText(review.text);
    setMessage("");
  };

  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-semibold tracking-tight">Customer Reviews</h2>
      {user && reviewableOrders.length > 0 ? (
        <form onSubmit={submit} className="mt-5 rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-semibold">{editingId ? "Edit your review" : "Review this product"}</h3>
          {!editingId ? (
            <select required value={orderId} onChange={(event) => setOrderId(event.target.value)} className="mt-4 h-11 rounded-full border border-border bg-white px-4 text-sm">
              <option value="">Choose purchased order</option>
              {reviewableOrders.map((order) => <option key={order.id} value={order.id}>{order.id}</option>)}
            </select>
          ) : null}
          <div className="mt-4 flex gap-1" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button type="button" key={value} onClick={() => setRating(value)} className={`text-2xl ${value <= rating ? "text-accent" : "text-border"}`} aria-label={`${value} stars`}>★</button>
            ))}
          </div>
          <textarea required value={text} onChange={(event) => setText(event.target.value)} className="mt-3 min-h-24 w-full rounded-xl border border-border bg-white p-3 text-sm" placeholder="Write your review" />
          <button type="submit" className="mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">{editingId ? "Save review" : "Submit review"}</button>
          {message ? <p className="mt-2 text-sm text-muted">{message}</p> : null}
        </form>
      ) : user ? <p className="mt-3 text-sm text-muted">Purchase this product to submit a review.</p> : <p className="mt-3 text-sm text-muted">Sign in after purchasing to review this product.</p>}
      <div className="mt-6 space-y-4">
        {reviews.length === 0 ? <p className="text-sm text-muted">No reviews yet.</p> : reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">{review.customerName}</p><StarRating rating={review.rating} size="sm" /></div>
              <p className="text-xs text-muted">{new Date(review.updatedAt).toLocaleDateString()}</p>
            </div>
            <p className="mt-3 text-sm leading-6">{review.text}</p>
            {user?.id === review.customerId ? <div className="mt-3 flex gap-3 text-sm"><button onClick={() => startEdit(review)} className="font-semibold text-brand">Edit</button><button onClick={() => deleteReview(review.id, user.id)} className="font-semibold text-red-600">Delete</button></div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
