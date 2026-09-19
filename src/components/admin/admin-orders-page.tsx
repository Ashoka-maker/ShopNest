"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getAllOrders } from "@/lib/admin-storage";
import { updateOrderStatus } from "@/lib/order-storage";
import { formatCents } from "@/lib/money";
import type { Order } from "@/types/order";
import { ORDER_STATUS_OPTIONS, getOrderStatusLabel } from "@/types/order";
import { getAllProducts } from "@/features/products/data";
import { ORDERS_UPDATED_EVENT } from "@/lib/order-storage";

export function AdminOrdersPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "all">("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      router.push("/admin/login");
      return;
    }

    const loadOrders = () => {
      const allOrders = getAllOrders();
      setOrders(allOrders);
      setLoading(false);
    };

    loadOrders();
    window.addEventListener(ORDERS_UPDATED_EVENT, loadOrders);
    window.addEventListener("storage", loadOrders);
    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, loadOrders);
      window.removeEventListener("storage", loadOrders);
    };
  }, [user, isAdmin, router]);

  const handleUpdateStatus = async (orderId: string, newStatus: Order["status"]) => {
    const success = updateOrderStatus(orderId, newStatus);
    if (success) {
      const updatedOrders = getAllOrders();
      setOrders(updatedOrders);
    }
  };

  const visibleOrders = statusFilter === "all"
    ? orders
    : orders.filter((order) => order.status === statusFilter);

  if (loading) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-border rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-border rounded w-1/2"></div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Order Management
            </h1>
            <p className="mt-2 text-base text-muted">
              View and manage all orders
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Orders Table */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                All Orders ({visibleOrders.length})
              </h2>
              <label className="text-sm font-medium">
                Filter status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as Order["status"] | "all")}
                  className="ml-2 rounded-lg border border-border bg-white px-3 py-2 font-normal"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="out-for-delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base text-muted">
                No orders found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-background/30">
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm">{order.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p>{order.shippingAddress.fullName}</p>
                        <p className="text-xs text-muted">{order.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="space-y-1">
                          {order.items.map((item) => {
                            const product = getAllProducts().find((candidate) => candidate.id === item.productId);
                            return (
                              <p key={`${item.productId}-${item.size ?? "default"}`}>
                                {product?.name || item.productId} x {item.quantity}{item.size ? ` (${item.size})` : ""}
                              </p>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {Array.from(new Set(order.items.map((item) => getAllProducts().find((product) => product.id === item.productId)?.sellerName || "Unknown"))).join(", ")}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {formatCents(order.totalCents)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          order.status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : order.status === "shipped"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "out-for-delivery"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p>{order.paymentMethod === "cod" ? "COD" : "UPI"}</p>
                        <p className="text-xs text-muted capitalize">{order.paymentStatus || "pending"}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value as Order["status"])}
                            className="text-sm border border-border rounded-lg px-2 py-1"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            {ORDER_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{getOrderStatusLabel(status)}</option>)}
                          </select>
                          <button
                            type="button"
                            className="text-sm font-medium text-brand hover:text-brand-dark"
                            onClick={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}
                          >
                            {expandedOrderId === order.id ? "Hide details" : "View details"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleOrders.map((order) => (
                    expandedOrderId === order.id ? (
                      <tr key={`${order.id}-details`} className="bg-background/40">
                        <td colSpan={9} className="px-6 py-5">
                          <div className="grid gap-4 text-sm md:grid-cols-3">
                            <div>
                              <p className="text-muted">Seller(s)</p>
                              <p>{Array.from(new Set(order.items.map((item) => getAllProducts().find((product) => product.id === item.productId)?.sellerName || "Unknown seller"))).join(", ")}</p>
                            </div>
                            <div>
                              <p className="text-muted">Payment method</p>
                              <p>{order.paymentMethod === "cod" ? "Cash on Delivery" : "UPI Payment"}</p>
                            </div>
                            <div>
                              <p className="text-muted">Payment status</p>
                              <p className="capitalize">{order.paymentStatus || "pending"}</p>
                            </div>
                            <div className="md:col-span-3">
                              <p className="text-muted">Shipping address</p>
                              <p>{order.shippingAddress.fullName}, {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}. Mobile: {order.shippingAddress.mobileNumber}</p>
                            </div>
                            <div className="md:col-span-3">
                              <p className="text-muted">Complete products</p>
                              <div className="space-y-1">
                                {order.items.map((item) => {
                                  const product = getAllProducts().find((candidate) => candidate.id === item.productId);
                                  return <p key={`${item.productId}-${item.size ?? "default"}`}>{product?.name || item.productId} — Qty {item.quantity}{item.size ? ` — Size ${item.size}` : ""} — {formatCents(item.priceCents * item.quantity)}</p>;
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
