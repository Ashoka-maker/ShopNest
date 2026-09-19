import type { Order } from "@/types/order";
import type { Review } from "@/types/review";

const REVIEWS_KEY = "shopnest_reviews";
export const REVIEWS_UPDATED_EVENT = "shopnest:reviews-updated";

function getStoredReviews(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]") as Review[];
  } catch {
    return [];
  }
}

function saveReviews(reviews: Review[]) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT));
}

export function getReviewsForProduct(productId: string): Review[] {
  return getStoredReviews().filter((review) => review.productId === productId && !review.isHidden);
}

export function getAllReviews(): Review[] {
  return getStoredReviews();
}

export function getReviewSummary(productId: string) {
  const reviews = getReviewsForProduct(productId);
  return {
    rating: reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0,
    reviewCount: reviews.length,
  };
}

export function getReviewableOrders(customerId: string, productId: string): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const orders = JSON.parse(localStorage.getItem("shopnest_orders") || "[]") as Order[];
    const reviewedOrderIds = new Set(
      getStoredReviews()
        .filter((review) => review.customerId === customerId && review.productId === productId)
        .map((review) => review.orderId),
    );
    return orders.filter(
      (order) =>
        order.customerId === customerId &&
        order.status !== "pending" &&
        order.status !== "cancelled" &&
        !reviewedOrderIds.has(order.id) &&
        order.items.some((item) => item.productId === productId),
    );
  } catch {
    return [];
  }
}

export function saveReview(review: Omit<Review, "id" | "createdAt" | "updatedAt" | "isHidden">): Review {
  const now = new Date().toISOString();
  const saved: Review = {
    ...review,
    id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    isHidden: false,
  };
  saveReviews([...getStoredReviews(), saved]);
  return saved;
}

export function updateReview(reviewId: string, customerId: string, updates: Pick<Review, "rating" | "text">): boolean {
  const reviews = getStoredReviews();
  const index = reviews.findIndex((review) => review.id === reviewId && review.customerId === customerId);
  if (index < 0) return false;
  reviews[index] = { ...reviews[index], ...updates, updatedAt: new Date().toISOString() };
  saveReviews(reviews);
  return true;
}

export function deleteReview(reviewId: string, customerId?: string): boolean {
  const reviews = getStoredReviews();
  const filtered = reviews.filter(
    (review) => !(review.id === reviewId && (!customerId || review.customerId === customerId)),
  );
  if (filtered.length === reviews.length) return false;
  saveReviews(filtered);
  return true;
}

export function setReviewHidden(reviewId: string, hidden: boolean): boolean {
  const reviews = getStoredReviews();
  const index = reviews.findIndex((review) => review.id === reviewId);
  if (index < 0) return false;
  reviews[index] = { ...reviews[index], isHidden: hidden };
  saveReviews(reviews);
  return true;
}
