"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getSellerByUserId, getSellerProducts, deleteSellerProduct } from "@/lib/seller-storage";
import type { Seller } from "@/types/seller";
import type { SellerProduct } from "@/types/product";
import { formatCents } from "@/lib/money";
import { CATEGORIES } from "@/lib/constants";
import { SellerOrdersSection } from "@/components/seller/seller-orders-section";
import { SellerReviewsSection } from "@/components/seller/seller-reviews-section";
import { getAllOrders } from "@/lib/order-storage";
import { getAvailableInventory, getSoldQuantity } from "@/lib/inventory-storage";

export function SellerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/signin");
      return;
    }

    const loadSellerData = () => {
      const sellerData = getSellerByUserId(user.id);
      if (!sellerData) {
        router.push("/seller/register");
        return;
      }
      setSeller(sellerData);

      const sellerProducts = getSellerProducts(sellerData.id);
      setProducts(sellerProducts);
      setLoading(false);
    };

    loadSellerData();
  }, [user, router]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const success = seller ? deleteSellerProduct(productId, seller.id) : false;
    if (success && seller) {
      const updatedProducts = getSellerProducts(seller.id);
      setProducts(updatedProducts);
    }
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

  if (!seller) {
    return null; // Will redirect
  }

  const totalProducts = products.length;
  const totalInventory = products.reduce((sum, p) => sum + p.inventory, 0);
  const totalRevenue = products.reduce((sum, p) => sum + (p.priceCents * p.inventory), 0);
  const orders = getAllOrders();

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Seller Dashboard
            </h1>
            <p className="mt-2 text-base text-muted">
              Welcome back, {seller.storeName}
            </p>
          </div>
          <Link href="/seller/products/new">
            <Button>
              + Add New Product
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">Total Products</p>
            <p className="mt-2 text-3xl font-semibold">{totalProducts}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">Total Inventory</p>
            <p className="mt-2 text-3xl font-semibold">{totalInventory}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">Potential Revenue</p>
            <p className="mt-2 text-3xl font-semibold">{formatCents(totalRevenue)}</p>
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Your Products ({products.length})
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base text-muted mb-4">
                You haven't added any products yet.
              </p>
              <Link href="/seller/products/new">
                <Button>Add Your First Product</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Inventory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => {
                    const category = CATEGORIES.find((c) => c.slug === product.category);
                    return (
                      <tr key={product.id} className="hover:bg-background/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#efe8dc]">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted">{product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                            {category?.name || product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {formatCents(product.priceCents)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p>Current: {getAvailableInventory(product)}</p>
                          <p className="text-xs text-muted">Sold: {getSoldQuantity(product.id, orders)}</p>
                          <p className="text-xs text-muted">Available: {getAvailableInventory(product)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            getAvailableInventory(product) > 0 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {getAvailableInventory(product) > 0 ? "In Stock" : "Out of Stock"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/seller/products/${product.id}/edit`}
                              className="text-sm font-medium text-brand hover:text-brand-dark"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <SellerOrdersSection sellerId={seller.id} />
        <SellerReviewsSection sellerId={seller.id} />

        {/* Store Info */}
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight mb-4">
            Store Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted">Store Name</p>
              <p className="font-medium">{seller.storeName}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Store ID</p>
              <p className="font-medium text-sm">{seller.id}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-muted">Store Bio</p>
              <p className="font-medium">{seller.bio}</p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
