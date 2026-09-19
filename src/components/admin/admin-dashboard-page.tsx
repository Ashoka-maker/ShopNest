"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getAdminStats, getRecentAdminActions } from "@/lib/admin-storage";
import { getAllUsers, getAllSellers } from "@/lib/admin-storage";
import type { AdminStats, AdminAction } from "@/types/admin";
import { formatCents } from "@/lib/money";
import { getAllOrders, ORDERS_UPDATED_EVENT } from "@/lib/order-storage";
import { getAllProducts } from "@/features/products/data";
import { SELLER_PRODUCTS_UPDATED_EVENT } from "@/lib/seller-storage";
import type { Order } from "@/types/order";

type DashboardAnalytics = {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalSellers: number;
  totalProducts: number;
  pendingOrders: number;
  deliveredOrders: number;
  pendingUpiVerification: number;
  recentOrders: Order[];
  topProducts: { productId: string; name: string; quantity: number }[];
};

export function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActions, setRecentActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      router.push("/admin/login");
      return;
    }

    const loadData = () => {
      const adminStats = getAdminStats();
      const actions = getRecentAdminActions(10);
      setStats(adminStats);
      setRecentActions(actions);
      const orders = getAllOrders();
      const products = getAllProducts();
      const productNames = new Map(products.map((product) => [product.id, product.name]));
      const activeOrders = orders.filter((order) => order.status !== "cancelled");
      const soldProducts = new Map<string, number>();
      activeOrders.forEach((order) => order.items.forEach((item) => {
        soldProducts.set(item.productId, (soldProducts.get(item.productId) || 0) + item.quantity);
      }));
      setAnalytics({
        totalOrders: orders.length,
        totalRevenue: activeOrders.reduce((sum, order) => sum + order.totalCents, 0),
        totalCustomers: getAllUsers().filter((candidate) => candidate.role === "customer").length,
        totalSellers: getAllSellers().length,
        totalProducts: products.length,
        pendingOrders: orders.filter((order) => order.status === "pending").length,
        deliveredOrders: orders.filter((order) => order.status === "delivered").length,
        pendingUpiVerification: orders.filter((order) => order.paymentMethod === "upi" && order.paymentStatus === "pending").length,
        recentOrders: orders.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5),
        topProducts: Array.from(soldProducts.entries())
          .sort(([, first], [, second]) => second - first)
          .slice(0, 5)
          .map(([productId, quantity]) => ({ productId, quantity, name: productNames.get(productId) || productId })),
      });
      setLoading(false);
    };

    loadData();
    window.addEventListener(ORDERS_UPDATED_EVENT, loadData);
    window.addEventListener(SELLER_PRODUCTS_UPDATED_EVENT, loadData);
    window.addEventListener("storage", loadData);
    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, loadData);
      window.removeEventListener(SELLER_PRODUCTS_UPDATED_EVENT, loadData);
      window.removeEventListener("storage", loadData);
    };
  }, [user, isAdmin, router]);

  const handleSignOut = () => {
    signOut();
    router.push("/admin/login");
  };

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

  if (!stats) return null;

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-base text-muted">
              Welcome back, {user?.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">Total Customers</p>
            <p className="mt-2 text-3xl font-semibold">{analytics?.totalCustomers ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">Total Sellers</p>
            <p className="mt-2 text-3xl font-semibold">{analytics?.totalSellers ?? 0}</p>
            {stats.pendingSellers > 0 && (
              <p className="mt-1 text-xs text-accent font-medium">
                {stats.pendingSellers} pending approval
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">Total Products</p>
            <p className="mt-2 text-3xl font-semibold">{analytics?.totalProducts ?? 0}</p>
            {stats.pendingProducts > 0 && (
              <p className="mt-1 text-xs text-accent font-medium">
                {stats.pendingProducts} pending approval
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">Total Orders</p>
            <p className="mt-2 text-3xl font-semibold">{analytics?.totalOrders ?? 0}</p>
            <p className="mt-1 text-xs text-muted font-medium">
              {formatCents(analytics?.totalRevenue ?? 0)} revenue
            </p>
          </div>
        </div>

        {analytics ? (
         <>
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
             <AnalyticsCard label="Pending Orders" value={analytics.pendingOrders} />
             <AnalyticsCard label="Delivered Orders" value={analytics.deliveredOrders} />
             <AnalyticsCard label="Pending UPI Verification" value={analytics.pendingUpiVerification} />
             <AnalyticsCard label="Total Revenue" value={formatCents(analytics.totalRevenue)} />
           </div>
           <div className="grid gap-6 lg:grid-cols-2 mb-8">
             <AnalyticsList title="Recent Orders">
               {analytics.recentOrders.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : analytics.recentOrders.map((order) => (
                 <div key={order.id} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
                   <div><p className="text-sm font-medium">{order.id}</p><p className="text-xs text-muted">{order.shippingAddress.fullName}</p></div>
                   <div className="text-right"><p className="text-sm font-semibold">{formatCents(order.totalCents)}</p><p className="text-xs text-muted">{order.status}</p></div>
                 </div>
               ))}
             </AnalyticsList>
             <AnalyticsList title="Top-selling Products">
               {analytics.topProducts.length === 0 ? <p className="text-sm text-muted">No product sales yet.</p> : analytics.topProducts.map((product) => (
                 <div key={product.productId} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
                   <p className="text-sm font-medium">{product.name}</p><p className="text-sm text-muted">{product.quantity} sold</p>
                 </div>
               ))}
             </AnalyticsList>
           </div>
         </>
        ) : null}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/admin/users">
            <div className="rounded-2xl border border-border bg-surface p-6 hover:border-brand/40 transition cursor-pointer">
              <h3 className="font-semibold mb-2">User Management</h3>
              <p className="text-sm text-muted">Manage user accounts</p>
            </div>
          </Link>
          <Link href="/admin/sellers">
            <div className="rounded-2xl border border-border bg-surface p-6 hover:border-brand/40 transition cursor-pointer">
              <h3 className="font-semibold mb-2">Seller Management</h3>
              <p className="text-sm text-muted">Approve/reject sellers</p>
            </div>
          </Link>
          <Link href="/admin/products">
            <div className="rounded-2xl border border-border bg-surface p-6 hover:border-brand/40 transition cursor-pointer">
              <h3 className="font-semibold mb-2">Product Management</h3>
              <p className="text-sm text-muted">Approve/reject products</p>
            </div>
          </Link>
          <Link href="/admin/orders">
            <div className="rounded-2xl border border-border bg-surface p-6 hover:border-brand/40 transition cursor-pointer">
              <h3 className="font-semibold mb-2">Order Management</h3>
              <p className="text-sm text-muted">View and manage orders</p>
            </div>
          </Link>
          <Link href="/admin/reviews">
            <div className="rounded-2xl border border-border bg-surface p-6 hover:border-brand/40 transition cursor-pointer">
              <h3 className="font-semibold mb-2">Review Management</h3>
              <p className="text-sm text-muted">Moderate customer reviews</p>
            </div>
          </Link>
          <Link href="/admin/coupons">
            <div className="rounded-2xl border border-border bg-surface p-6 hover:border-brand/40 transition cursor-pointer">
              <h3 className="font-semibold mb-2">Coupon Management</h3>
              <p className="text-sm text-muted">Create and manage discounts</p>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Recent Activity
            </h2>
          </div>

          {recentActions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base text-muted">
                No recent activity to display.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentActions.map((action) => (
                <div key={action.id} className="p-4 flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
                    <span className="text-brand text-xs font-semibold">
                      {action.type.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.description}</p>
                    <p className="text-xs text-muted mt-1">
                      {new Date(action.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function AnalyticsCard({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-border bg-surface p-6"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function AnalyticsList({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-6"><h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2><div className="mt-3">{children}</div></section>;
}
