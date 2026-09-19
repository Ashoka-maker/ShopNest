"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getAllProducts } from "@/features/products/data";
import { formatCents } from "@/lib/money";
import { cancelCustomerOrder, getOrdersByCustomerId, ORDERS_UPDATED_EVENT } from "@/lib/order-storage";
import { getOrderStatusLabel, ORDER_STATUS_OPTIONS, type Order } from "@/types/order";

export function CustomerOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/signin");
      return;
    }
    const load = () => setOrders(getOrdersByCustomerId(user.id));
    load();
    window.addEventListener(ORDERS_UPDATED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [router, user]);

  if (!user) return null;

  const cancelOrder = (orderId: string) => {
    if (cancelCustomerOrder(orderId, user.id)) {
      setMessage("Your order was cancelled.");
      setOrders(getOrdersByCustomerId(user.id));
    }
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">My Orders</h1>
        {orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-muted">You have not placed any orders yet.</p>
            <Link href="/products" className="mt-5 inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white">Start shopping</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {orders.slice().reverse().map((order) => (
              <article key={order.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap justify-between gap-3">
                  <div><p className="text-sm text-muted">Order number</p><p className="font-semibold">{order.id}</p></div>
                  <div><p className="text-sm text-muted">Order date</p><p>{new Date(order.createdAt).toLocaleDateString()}</p></div>
                  <div><p className="text-sm text-muted">Status</p><p className="font-semibold">{getOrderStatusLabel(order.status)}</p></div>
                </div>
                <div className="mt-5 space-y-2 border-t border-border pt-4">
                  {order.items.map((item) => {
                    const product = getAllProducts().find((candidate) => candidate.id === item.productId);
                    return <p key={`${item.productId}-${item.size ?? "default"}`} className="text-sm">{product?.name || item.productId} × {item.quantity}{item.size ? ` (Size: ${item.size})` : ""}</p>;
                  })}
                </div>
                <div className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
                  <div><p className="text-muted">Total</p><p className="font-semibold">{formatCents(order.totalCents)}</p></div>
                  <div><p className="text-muted">Payment method</p><p>{order.paymentMethod === "cod" ? "Cash on Delivery" : "UPI Payment"}</p></div>
                  <div><p className="text-muted">Delivery address</p><p>{order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p></div>
                </div>
                {order.status !== "cancelled" ? (
                  <div className="mt-6 border-t border-border pt-5">
                    <p className="text-sm font-semibold">Order tracking</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-7">
                      {ORDER_STATUS_OPTIONS.filter((status) => status !== "cancelled").map((status) => {
                        const currentStatus = order.status === "processing" ? "packed" : order.status === "paid" ? "confirmed" : order.status;
                        const currentIndex = ORDER_STATUS_OPTIONS.indexOf(currentStatus as typeof status);
                        const statusIndex = ORDER_STATUS_OPTIONS.indexOf(status);
                        return (
                          <div key={status} className="flex items-center gap-2 sm:block">
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${statusIndex <= currentIndex ? "bg-brand text-white" : "bg-border text-muted"}`}>{statusIndex < currentIndex ? "✓" : statusIndex + 1}</span>
                            <span className="text-xs text-muted sm:mt-2 sm:block">{getOrderStatusLabel(status)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : <p className="mt-5 border-t border-border pt-4 text-sm font-semibold text-red-600">Order cancelled</p>}
                {order.status === "pending" || order.status === "confirmed" ? (
                  <button type="button" onClick={() => cancelOrder(order.id)} className="mt-5 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Cancel order</button>
                ) : null}
              </article>
            ))}
          </div>
        )}
        {message ? <p className="mt-4 text-sm font-medium text-green-700">{message}</p> : null}
      </div>
    </Container>
  );
}
