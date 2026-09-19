import type { Coupon, CouponInput } from "@/types/coupon";

const COUPONS_KEY = "shopnest_coupons";
export const COUPONS_UPDATED_EVENT = "shopnest:coupons-updated";

function getStoredCoupons(): Coupon[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(COUPONS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveCoupons(coupons: Coupon[]) {
  localStorage.setItem(COUPONS_KEY, JSON.stringify(coupons));
  window.dispatchEvent(new CustomEvent(COUPONS_UPDATED_EVENT));
}

export function getAllCoupons() {
  return getStoredCoupons();
}

export function saveCoupon(input: CouponInput, id?: string): Coupon {
  const coupons = getStoredCoupons();
  const now = new Date().toISOString();
  const existing = id ? coupons.find((coupon) => coupon.id === id) : undefined;
  const coupon: Coupon = {
    ...input,
    code: input.code.trim().toUpperCase(),
    id: existing?.id || `coupon-${Date.now()}`,
    usageCount: existing?.usageCount || 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const next = existing ? coupons.map((item) => item.id === id ? coupon : item) : [...coupons, coupon];
  saveCoupons(next);
  return coupon;
}

export function setCouponActive(id: string, active: boolean) {
  const coupons = getStoredCoupons();
  saveCoupons(coupons.map((coupon) => coupon.id === id ? { ...coupon, active, updatedAt: new Date().toISOString() } : coupon));
}

export function deleteCoupon(id: string) {
  saveCoupons(getStoredCoupons().filter((coupon) => coupon.id !== id));
}

export function validateCoupon(code: string, subtotalCents: number): { coupon?: Coupon; discountCents: number; error?: string } {
  const coupon = getStoredCoupons().find((item) => item.code === code.trim().toUpperCase());
  if (!coupon) return { discountCents: 0, error: "Coupon code not found." };
  const now = Date.now();
  if (!coupon.active) return { discountCents: 0, error: "This coupon is inactive." };
  if (coupon.startsAt && now < Date.parse(coupon.startsAt)) return { discountCents: 0, error: "This coupon is not active yet." };
  if (coupon.expiresAt && now > Date.parse(coupon.expiresAt)) return { discountCents: 0, error: "This coupon has expired." };
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) return { discountCents: 0, error: "This coupon has reached its usage limit." };
  if (subtotalCents < coupon.minOrderCents) return { discountCents: 0, error: `Minimum order value is ₹${(coupon.minOrderCents / 100).toLocaleString("en-IN")}.` };
  const rawDiscount = coupon.discountType === "percentage"
    ? Math.floor(subtotalCents * coupon.value / 100)
    : coupon.value;
  const cappedDiscount = coupon.maxDiscountCents === null ? rawDiscount : Math.min(rawDiscount, coupon.maxDiscountCents);
  return { coupon, discountCents: Math.min(cappedDiscount, subtotalCents) };
}

export function incrementCouponUsage(code: string) {
  const normalized = code.trim().toUpperCase();
  saveCoupons(getStoredCoupons().map((coupon) => coupon.code === normalized ? { ...coupon, usageCount: coupon.usageCount + 1 } : coupon));
}
