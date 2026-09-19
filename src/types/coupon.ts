export type CouponDiscountType = "percentage" | "fixed";

export type Coupon = {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  value: number;
  minOrderCents: number;
  maxDiscountCents: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CouponInput = Omit<Coupon, "id" | "usageCount" | "createdAt" | "updatedAt">;
