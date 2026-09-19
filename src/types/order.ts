export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "processing"
  | "paid";

export const ORDER_STATUS_OPTIONS: Exclude<OrderStatus, "processing" | "paid">[] = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "out-for-delivery",
  "delivered",
  "cancelled",
];

export function getOrderStatusLabel(status: OrderStatus) {
  if (status === "out-for-delivery") return "Out for Delivery";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

import type { ProductSize } from "./product";

export type OrderItem = {
  productId: string;
  quantity: number;
  priceCents: number;
  size?: ProductSize;
};

export type ShippingAddress = {
  fullName: string;
  mobileNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export type PaymentMethod = "upi" | "cod";
export type PaymentStatus = "pending" | "paid";

export type Order = {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  shippingAddress: ShippingAddress;
  subtotalCents: number;
  deliveryChargeCents: number;
  totalCents: number;
  customerEmail: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  upiTransactionId?: string;
  inventoryAdjusted?: boolean;
  inventoryRestored?: boolean;
  couponCode?: string;
  couponDiscountCents?: number;
};
