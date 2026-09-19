"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { getAllProducts } from "@/features/products/data";
import { formatCents } from "@/lib/money";
import { saveOrder, generateOrderId, calculateDeliveryCharge } from "@/lib/order-storage";
import type { Order, PaymentMethod, ShippingAddress } from "@/types/order";
import { getAvailableInventory, getAvailableInventoryForSize, reduceInventoryForOrder } from "@/lib/inventory-storage";
import { markOrderInventoryAdjusted } from "@/lib/order-storage";
import { incrementCouponUsage, validateCoupon } from "@/lib/coupon-storage";
import type { Coupon } from "@/types/coupon";

async function sendConfirmationEmail(order: Order): Promise<boolean> {
  const response = await fetch("/api/order-confirmation-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: order.id,
      customerEmail: order.customerEmail,
      customerName: order.shippingAddress.fullName,
      items: order.items.map((item) => {
        const product = getAllProducts().find((candidate) => candidate.id === item.productId);
        return { name: product?.name || item.productId, quantity: item.quantity, size: item.size, priceCents: item.priceCents };
      }),
      totalCents: order.totalCents,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
    }),
  });
  return response.ok;
}

export function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscountCents, setCouponDiscountCents] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "");

  useEffect(() => {
    if (user?.email && !customerEmail) setCustomerEmail(user.email);
  }, [user?.email, customerEmail]);
  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    mobileNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const cartItems = cart.items
    .map((item) => ({
      item,
      product: getAllProducts().find((p) => p.id === item.productId),
    }))
    .filter(({ product }) => product !== undefined);

  const subtotal = cart.items.reduce((total, item) => {
    const product = getAllProducts().find((p) => p.id === item.productId);
    if (!product) return total;
    return total + product.priceCents * item.quantity;
  }, 0);

  const deliveryCharge = calculateDeliveryCharge(subtotal);
  const total = subtotal + deliveryCharge - couponDiscountCents;

  const applyCoupon = () => {
    const result = validateCoupon(couponCode, subtotal);
    if (!result.coupon) {
      setAppliedCoupon(null);
      setCouponDiscountCents(0);
      setCouponMessage(result.error || "Unable to apply coupon.");
      return;
    }
    setAppliedCoupon(result.coupon);
    setCouponDiscountCents(result.discountCents);
    setCouponMessage(`Coupon applied. You saved ${formatCents(result.discountCents)}.`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscountCents(0);
    setCouponCode("");
    setCouponMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Geolocation is not supported by this browser.");
      return;
    }
    setLocationMessage("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const fallback = `Detected coordinates: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          if (!response.ok) throw new Error("Reverse geocoding failed");
          const result = (await response.json()) as { display_name?: string; address?: Record<string, string> };
          const address = result.address ?? {};
          setFormData((prev) => ({
            ...prev,
            address: result.display_name || fallback,
            city: address.city || address.town || address.village || prev.city,
            state: address.state || prev.state,
            pincode: address.postcode || prev.pincode,
          }));
          setLocationMessage("Location detected. Review and edit the address before placing your order.");
        } catch {
          setFormData((prev) => ({ ...prev, address: fallback }));
          setLocationMessage("Coordinates detected. Please complete and confirm the editable address fields.");
        }
      },
      () => setLocationMessage("Unable to access your location. Enter the delivery address manually."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailMessage("");
    setPaymentMessage("");
    setIsSubmitting(true);
    const couponResult = appliedCoupon ? validateCoupon(appliedCoupon.code, subtotal) : { discountCents: 0 };
    if (appliedCoupon && !couponResult.coupon) {
      setCouponMessage(couponResult.error || "Coupon is no longer valid.");
      setIsSubmitting(false);
      return;
    }
    const finalDiscountCents = couponResult.discountCents;
    const finalTotal = subtotal + deliveryCharge - finalDiscountCents;
    const unavailable = cart.items.find((item) => {
      const product = getAllProducts().find((candidate) => candidate.id === item.productId);
      return !product || (item.size ? getAvailableInventoryForSize(product, item.size) < item.quantity : getAvailableInventory(product) < item.quantity);
    });
    if (unavailable) {
      setPaymentMessage("One or more products no longer have enough stock. Please update your cart.");
      setIsSubmitting(false);
      return;
    }

    // Create shipping address
    const shippingAddress: ShippingAddress = {
      fullName: formData.fullName,
      mobileNumber: formData.mobileNumber,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
    };

    const baseOrder: Order = {
      id: generateOrderId(),
      customerId: user?.id || "guest-" + Date.now(),
      items: cart.items.map((item) => {
        const product = getAllProducts().find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          quantity: item.quantity,
          priceCents: product?.priceCents || 0,
          size: item.size,
        };
      }),
      status: paymentMethod === "cod" ? "confirmed" : "pending",
      createdAt: new Date().toISOString(),
      shippingAddress,
      subtotalCents: subtotal,
      deliveryChargeCents: deliveryCharge,
      totalCents: finalTotal,
      customerEmail: customerEmail.trim(),
      paymentMethod,
      paymentStatus: "pending" as const,
      ...(paymentMethod === "upi" && upiTransactionId.trim() ? { upiTransactionId: upiTransactionId.trim() } : {}),
      ...(appliedCoupon ? { couponCode: appliedCoupon.code, couponDiscountCents: finalDiscountCents } : {}),
    };

    const completeOrder = async (order: Order) => {
      const emailSent = await sendConfirmationEmail(order);
      clearCart();
      router.push(`/checkout/confirmation?orderId=${order.id}${emailSent ? "" : "&emailStatus=failed"}`);
    };

    if (paymentMethod === "cod") {
      saveOrder(baseOrder);
      if (appliedCoupon) incrementCouponUsage(appliedCoupon.code);
      if (reduceInventoryForOrder(baseOrder)) markOrderInventoryAdjusted(baseOrder.id);
      await completeOrder(baseOrder);
      return;
    }

    saveOrder(baseOrder);
    if (appliedCoupon) incrementCouponUsage(appliedCoupon.code);
    const emailSent = await sendConfirmationEmail(baseOrder);
    clearCart();
    router.push(`/checkout/confirmation?orderId=${baseOrder.id}${emailSent ? "" : "&emailStatus=failed"}`);
  };

  if (cartItems.length === 0) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your cart is empty
          </h1>
          <p className="mt-4 text-base text-muted">
            Add items to your cart before proceeding to checkout.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Start Shopping
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Checkout
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address Section */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Shipping Address
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="customerEmail" className="block text-sm font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  required
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                  placeholder="you@example.com"
                />
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="font-display text-lg font-semibold tracking-tight">Coupon or discount code</h2>
                <div className="mt-4 flex gap-2">
                  <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} disabled={Boolean(appliedCoupon)} placeholder="Enter coupon code" className="h-11 min-w-0 flex-1 rounded-full border border-border bg-white px-4 text-sm" />
                  {appliedCoupon ? <button type="button" onClick={removeCoupon} className="rounded-full border border-border px-4 text-sm font-semibold">Remove</button> : <button type="button" onClick={applyCoupon} className="rounded-full bg-brand px-4 text-sm font-semibold text-white">Apply</button>}
                </div>
                {couponMessage ? <p className="mt-2 text-sm text-muted">{couponMessage}</p> : null}
              </div>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="mobileNumber" className="block text-sm font-medium mb-2">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  id="mobileNumber"
                  name="mobileNumber"
                  required
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                  placeholder="123 Main Street, Apt 4B"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                    placeholder="NY"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pincode" className="block text-sm font-medium mb-2">
                  Pincode *
                </label>
                <input
                  type="text"
                  id="pincode"
                  name="pincode"
                  required
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                  placeholder="10001"
                />
              </div>
              <button type="button" onClick={useCurrentLocation} className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand">
                Use my current location
              </button>
              {locationMessage ? <p className="text-xs text-muted">{locationMessage}</p> : null}
            </div>
          </div>

          {/* Cart Items Section */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Order Items ({cartItems.length})
              </h2>
              <Link
                href="/cart"
                className="text-sm font-semibold text-brand hover:text-brand-dark"
              >
                Edit Cart
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              {cartItems.map(({ item, product }) => (
                product ? (
                  <div key={`${item.productId}-${item.size ?? "default"}`} className="flex gap-4 border-b border-border pb-4 last:border-0">
                    <div className="relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#efe8dc]">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-1 flex-col">
                      <p className="font-semibold text-sm">{product.name}</p>
                      <p className="text-xs text-muted">Qty: {item.quantity}</p>
                      {item.size ? <p className="text-xs text-muted">Size: {item.size}</p> : null}
                      <p className="mt-auto font-semibold text-sm">
                        {formatCents(product.priceCents * item.quantity)}
                      </p>
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">Payment Method</h2>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4">
                <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                <span><strong>Cash on Delivery (COD)</strong><br /><span className="text-sm text-muted">Order confirmed; payment collected on delivery</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4">
                <input type="radio" name="paymentMethod" value="upi" checked={paymentMethod === "upi"} onChange={() => setPaymentMethod("upi")} />
                <span><strong>UPI Payment</strong><br /><span className="text-sm text-muted">Pay securely to 9663427720@ybl. Payment remains pending until manually verified.</span></span>
              </label>
              {paymentMethod === "upi" ? (
                <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
                  <p className="font-semibold">Pay using any UPI app</p>
                  <a href={`upi://pay?pa=9663427720@ybl&pn=ShopNest&am=${(total / 100).toFixed(2)}&cu=INR`} className="mt-2 inline-flex rounded-full bg-brand px-4 py-2 font-semibold text-white">Open UPI app</a>
                  <p className="mt-3 text-muted">UPI ID: <strong className="text-foreground">9663427720@ybl</strong></p>
                  <label className="mt-3 grid gap-1 text-sm font-medium">UPI transaction reference (optional)<input value={upiTransactionId} onChange={(event) => setUpiTransactionId(event.target.value)} placeholder="Enter reference after payment" className="h-10 rounded-lg border border-border bg-white px-3 font-normal" /></label>
                  <p className="mt-2 text-xs text-muted">Your order will be saved as Payment Pending. ShopNest will not mark it paid until payment is verified.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Order Summary
              </h2>

              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-medium">{formatCents(subtotal)}</span>
                </div>
                {couponDiscountCents > 0 ? <div className="flex justify-between text-sm text-green-700"><span>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ""}</span><span>-{formatCents(couponDiscountCents)}</span></div> : null}
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Payment</span>
                  <span className="font-medium">{paymentMethod === "cod" ? "Cash on Delivery" : "UPI / Payment Pending"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Delivery</span>
                  <span className="font-medium">
                    {deliveryCharge === 0 ? "FREE" : formatCents(deliveryCharge)}
                  </span>
                </div>
                {emailMessage ? <p className="mt-4 text-xs text-amber-700">{emailMessage}</p> : null}
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCents(total)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Place Order"}
                </Button>
              </div>

              {deliveryCharge === 0 && (
                <p className="mt-4 text-xs text-muted text-center">
                  🎉 Free delivery applied!
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </Container>
  );
}
