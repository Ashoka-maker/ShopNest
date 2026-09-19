const WISHLIST_PREFIX = "shopnest_wishlist_";
export const WISHLIST_UPDATED_EVENT = "shopnest:wishlist-updated";

function keyForUser(userId: string) {
  return `${WISHLIST_PREFIX}${userId}`;
}

export function getWishlistProductIds(userId: string): string[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(keyForUser(userId)) || "[]");
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveWishlistProductIds(userId: string, productIds: string[]) {
  localStorage.setItem(keyForUser(userId), JSON.stringify([...new Set(productIds)]));
  window.dispatchEvent(new CustomEvent(WISHLIST_UPDATED_EVENT));
}

export function isInWishlist(userId: string | undefined, productId: string) {
  return userId ? getWishlistProductIds(userId).includes(productId) : false;
}

export function toggleWishlist(userId: string, productId: string): boolean {
  const ids = getWishlistProductIds(userId);
  const nextIds = ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId];
  saveWishlistProductIds(userId, nextIds);
  return nextIds.includes(productId);
}

export function removeFromWishlist(userId: string, productId: string) {
  saveWishlistProductIds(userId, getWishlistProductIds(userId).filter((id) => id !== productId));
}
