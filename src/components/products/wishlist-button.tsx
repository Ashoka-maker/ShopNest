"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isInWishlist, toggleWishlist, WISHLIST_UPDATED_EVENT } from "@/lib/wishlist-storage";

export function WishlistButton({ productId, className = "" }: { productId: string; className?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const refresh = () => setSaved(isInWishlist(user?.id, productId));
    refresh();
    window.addEventListener(WISHLIST_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(WISHLIST_UPDATED_EVENT, refresh);
  }, [productId, user?.id]);

  const handleClick = () => {
    if (!user) {
      router.push("/signin");
      return;
    }
    setSaved(toggleWishlist(user.id, productId));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white/95 text-xl shadow-sm transition hover:border-brand hover:text-brand ${className}`}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={saved}
    >
      <span aria-hidden>{saved ? "♥" : "♡"}</span>
    </button>
  );
}
