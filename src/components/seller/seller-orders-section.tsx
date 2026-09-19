"use client";

import { useEffect, useMemo, useState } from "react";
import { getAllProducts } from "@/features/products/data";
import { formatCents } from "@/lib/money";
import {
  getAllOrders,
  ORDERS_UPDATED_EVENT,
  updateOrderStatus,
} from "@/lib/order-storage";
import { ORDER_STATUS_OPTIONS, getOrderStatusLabel, type Order, type OrderStatus } from "@/types/order";

const statusOptions = ORDER_STATUS_OPTIONS.filter((status) => status !== "pending");

export function SellerOrdersSection({ sellerId }: { sellerId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = () => setOrders(getAllOrders());
    load();
    window.addEventListener(ORDERS_UPDATED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const sellerProductIds = useMemo(
    () => new Set(getAllProducts().filter((product) => product.sellerId === sellerId).map((product) => product.id)),
    [sellerId],
  );
  const rows = orders.flatMap((order) =>
    order.items
      .filter((item) => sellerProductIds.has(item.productId))
      .map((item) => ({ order, item, product: getAllProducts().find((product) => product.id === item.productId) })),
  );

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    if (status !== "pending" && statusOptions.includes(status as typeof statusOptions[number])) updateOrderStatus(orderId, status);
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Orders ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No orders contain your products yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map(({ order, item, product }) => (
            <article key={`${order.id}-${item.productId}-${item.size ?? "default"}`} className="rounded-xl border border-border bg-white p-4">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div><p className="text-muted">Order</p><p className="font-semibold">{order.id}</p></div>
                <div><p className="text-muted">Customer</p><p>{order.shippingAddress.fullName}</p></div>
                <div><p className="text-muted">Date</p><p>{new Date(order.createdAt).toLocaleDateString()}</p></div>
                <div><p className="text-muted">Product</p><p>{product?.name || item.productId}</p></div>
                <div><p className="text-muted">Quantity / Size</p><p>{item.quantity}{item.size ? ` / ${item.size}` : ""}</p></div>
                <div><p className="text-muted">Amount</p><p className="font-semibold">{formatCents(item.priceCents * item.quantity)}</p></div>
                <div><p className="text-muted">Payment</p><p>{order.paymentMethod === "cod" ? "Cash on Delivery" : "UPI Payment"}</p></div>
                <div className="md:col-span-2"><p className="text-muted">Shipping address</p><p>{order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p></div>
              </div>
              <label className="mt-4 block text-sm font-medium">
                Current status
                <select
                  value={order.status}
                  onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                  className="ml-3 rounded-lg border border-border px-3 py-2 font-normal"
                >
                  <option value="pending">Pending</option>
                  {statusOptions.map((status) => <option key={status} value={status}>{getOrderStatusLabel(status)}</option>)}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
