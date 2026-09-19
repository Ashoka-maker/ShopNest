"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { getAllProducts } from "@/features/products/data";
import { formatCents } from "@/lib/money";
import { getOrderById } from "@/lib/order-storage";
import type { Order } from "@/types/order";

export function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailFailed, setEmailFailed] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      const params = await searchParams;
      const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
      setEmailFailed(params.emailStatus === "failed");
      
      if (!orderId) {
        router.push("/products");
        return;
      }

      const loadedOrder = getOrderById(orderId);
      setOrder(loadedOrder);
      setLoading(false);
    }

    loadOrder();
  }, [searchParams, router]);

  if (loading) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-border rounded mx-auto w-3/4 mb-4"></div>
            <div className="h-4 bg-border rounded mx-auto w-1/2"></div>
          </div>
        </div>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Order Not Found
          </h1>
          <p className="mt-4 text-base text-muted">
            We couldn't find your order. It may have been removed or the link is invalid.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Continue Shopping
          </Link>
        </div>
      </Container>
    );
  }

  const orderItems = order.items.map((item) => ({
    item,
    product: getAllProducts().find((p) => p.id === item.productId),
  })).filter(({ product }) => product !== undefined);

  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5); // 5 days from now

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <svg
              className="h-8 w-8 text-brand"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Order Confirmed!
          </h1>
          <p className="mt-2 text-base text-muted">
            Thank you for your purchase. Your order has been placed successfully.
          </p>
          {emailFailed ? (
            <p className="mt-3 text-sm text-amber-700">
              Your order was saved, but the confirmation email could not be sent. Configure Resend to enable delivery.
            </p>
          ) : null}
        </div>

        {/* Order Details Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Order Number</p>
              <p className="font-semibold">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Payment</p>
              <p className="font-semibold">
                {order.paymentMethod === "cod"
                  ? "Cash on Delivery"
                  : order.paymentMethod === "upi"
                    ? "UPI / Payment Pending"
                    : "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted">Order Date</p>
              <p className="font-semibold">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted">Status</p>
              <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-display text-lg font-semibold tracking-tight mb-4">
            Shipping Address
          </h2>
          <div className="space-y-1">
            <p className="font-medium">{order.shippingAddress.fullName}</p>
            <p className="text-sm text-muted">{order.shippingAddress.mobileNumber}</p>
            <p className="text-sm">{order.shippingAddress.address}</p>
            <p className="text-sm">
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
            </p>
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-display text-lg font-semibold tracking-tight mb-4">
            Order Items ({orderItems.length})
          </h2>
          <div className="space-y-4">
            {orderItems.map(({ item, product }) => (
              product ? (
                <div key={`${item.productId}-${item.size ?? "default"}`} className="flex gap-4 border-b border-border pb-4 last:border-0">
                  <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#efe8dc]">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted">Qty: {item.quantity}</p>
                    {item.size ? <p className="text-sm text-muted">Size: {item.size}</p> : null}
                    <p className="mt-auto font-semibold">
                      {formatCents(item.priceCents * item.quantity)}
                    </p>
                  </div>
                </div>
              ) : null
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-display text-lg font-semibold tracking-tight mb-4">
            Payment Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium">{formatCents(order.subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Delivery</span>
              <span className="font-medium">
                {order.deliveryChargeCents === 0 ? "FREE" : formatCents(order.deliveryChargeCents)}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCents(order.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Delivery */}
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
              <svg
                className="h-5 w-5 text-brand"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Estimated Delivery</h3>
              <p className="mt-1 text-sm text-muted">
                Your order is expected to arrive by{" "}
                <span className="font-medium text-foreground">
                  {estimatedDeliveryDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted">
                You'll receive tracking information via email once your order ships.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/products" className={`${buttonClassName("primary")} w-full sm:w-auto`}>
            Continue Shopping
          </Link>
          <Link
            href="/products"
            className={`${buttonClassName("secondary")} w-full sm:w-auto`}
          >
            Browse More Products
          </Link>
        </div>
      </div>
    </Container>
  );
}
