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
import {
  createCustomerReturnRequest,
  getReturnRequestsByCustomerId,
  RETURN_REQUESTS_UPDATED_EVENT,
} from "@/lib/return-request-storage";
import {
  getReturnRequestStatusLabel,
  RETURN_REASONS,
  type ReturnReason,
  type ReturnRequest,
} from "@/types/return-request";
import type { ProductSize } from "@/types/product";

export function CustomerOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [message, setMessage] = useState("");
  const [returnItem, setReturnItem] = useState<{ orderId: string; productId: string; size?: ProductSize } | null>(null);
  const [returnReason, setReturnReason] = useState<ReturnReason>("Wrong Product");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);

  useEffect(() => {
    if (!user) {
      router.push("/signin");
      return;
    }
    const load = () => {
      setOrders(getOrdersByCustomerId(user.id));
      setReturnRequests(getReturnRequestsByCustomerId(user.id));
    };
    load();
    window.addEventListener(ORDERS_UPDATED_EVENT, load);
    window.addEventListener(RETURN_REQUESTS_UPDATED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, load);
      window.removeEventListener(RETURN_REQUESTS_UPDATED_EVENT, load);
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

  const requestKey = (orderId: string, productId: string, size?: string) =>
    `${orderId}-${productId}-${size ?? "default"}`;

  const submitReturnRequest = () => {
    if (!returnItem) return;
    const result = createCustomerReturnRequest({
      ...returnItem,
      customerId: user.id,
      quantity: returnQuantity,
      reason: returnReason,
      description: returnDescription,
    });
    if (!result.success) {
      setMessage(result.error || "Unable to submit the return request.");
      return;
    }
    setMessage("Return request submitted. It will be reviewed by the seller.");
    setReturnRequests(getReturnRequestsByCustomerId(user.id));
    setReturnItem(null);
    setReturnDescription("");
    setReturnQuantity(1);
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
                <div className="mt-5 space-y-3 border-t border-border pt-4">
                  {order.items.map((item) => {
                    const product = getAllProducts().find((candidate) => candidate.id === item.productId);
                    const itemKey = requestKey(order.id, item.productId, item.size);
                    const request = returnRequests.find((candidate) => requestKey(candidate.orderId, candidate.productId, candidate.size) === itemKey);
                    return (
                      <div key={`${item.productId}-${item.size ?? "default"}`} className="rounded-lg border border-border p-3">
                        <p className="text-sm">{product?.name || item.productId} × {item.quantity}{item.size ? ` (Size: ${item.size})` : ""}</p>
                        {request ? (
                          <div className="mt-2 text-xs">
                            <p className="font-semibold text-brand">Return status: {getReturnRequestStatusLabel(request.status)}</p>
                            <p className="text-muted">Requested {new Date(request.createdAt).toLocaleDateString()} · Refund: {request.refundStatus === "refunded" ? "Refunded (manual)" : getReturnRequestStatusLabel(request.refundStatus === "processing" ? "refund-processing" : "requested")}</p>
                            {request.sellerResponse || request.adminResponse ? <p className="mt-1 text-muted">Response: {request.adminResponse || request.sellerResponse}</p> : null}
                            <div className="mt-3 space-y-2 border-l-2 border-brand/30 pl-3">
                              {request.timeline.map((entry) => (
                                <div key={`${entry.status}-${entry.createdAt}`} className="text-xs">
                                  <p className="font-semibold">{getReturnRequestStatusLabel(entry.status)}</p>
                                  <p className="text-muted">{new Date(entry.createdAt).toLocaleString()}{entry.note ? ` · ${entry.note}` : ""}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : order.status === "delivered" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReturnItem({ orderId: order.id, productId: item.productId, ...(item.size ? { size: item.size } : {}) });
                              setReturnQuantity(item.quantity);
                            }}
                            className="mt-2 rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5"
                          >
                            Return / Request Refund
                          </button>
                        ) : (
                          <p className="mt-2 text-xs text-muted">Return requests become available after delivery.</p>
                        )}
                      </div>
                    );
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
        {returnItem ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">Request a return or refund</h2>
                  <p className="mt-1 text-sm text-muted">Select a reason and provide any helpful details.</p>
                </div>
                <button type="button" onClick={() => setReturnItem(null)} className="text-muted hover:text-foreground" aria-label="Close return request">×</button>
              </div>
              <label className="mt-5 block text-sm font-medium">
                Reason
                <select value={returnReason} onChange={(event) => setReturnReason(event.target.value as ReturnReason)} className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal">
                  {RETURN_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                </select>
              </label>
              <label className="mt-4 block text-sm font-medium">
                Quantity
                <input type="number" min={1} value={returnQuantity} onChange={(event) => setReturnQuantity(Math.max(1, Number(event.target.value) || 1))} className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal" />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Description (optional)
                <textarea value={returnDescription} onChange={(event) => setReturnDescription(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal" placeholder="Tell us what happened" />
              </label>
              <p className="mt-4 text-xs text-muted">Refunds are processed separately. ShopNest does not claim a payment refund until an administrator marks it as processed.</p>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setReturnItem(null)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Close</button>
                <button type="button" onClick={submitReturnRequest} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">Submit request</button>
              </div>
            </div>
          </div>
        ) : null}
        {message ? <p className="mt-4 text-sm font-medium text-green-700">{message}</p> : null}
      </div>
    </Container>
  );
}
