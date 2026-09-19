"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getAllSellerProducts, approveProduct, rejectProduct, deleteProduct } from "@/lib/admin-storage";
import { CATEGORIES } from "@/lib/constants";
import { formatCents } from "@/lib/money";
import type { SellerProduct } from "@/types/product";
import { getAvailableInventory } from "@/lib/inventory-storage";

export function AdminProductsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) {
      router.push("/admin/login");
      return;
    }

    const loadProducts = () => {
      const allProducts = getAllSellerProducts();
      setProducts(allProducts);
      setLoading(false);
    };

    loadProducts();
  }, [user, isAdmin, router]);

  const handleApproveProduct = async (productId: string) => {
    const success = approveProduct(productId);
    if (success) {
      const updatedProducts = getAllSellerProducts();
      setProducts(updatedProducts);
    }
  };

  const handleRejectProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to reject this product?")) return;

    const success = rejectProduct(productId);
    if (success) {
      const updatedProducts = getAllSellerProducts();
      setProducts(updatedProducts);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

    const success = deleteProduct(productId);
    if (success) {
      const updatedProducts = getAllSellerProducts();
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

  const pendingProducts = products.filter(p => p.approvalStatus === "pending");
  const approvedProducts = products.filter(p => p.approvalStatus === "approved");

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Product Management
            </h1>
            <p className="mt-2 text-base text-muted">
              Approve and manage seller products
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Pending Products */}
        {pendingProducts.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden mb-8">
            <div className="p-6 border-b border-border bg-accent/5">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Pending Approval ({pendingProducts.length})
              </h2>
            </div>

            <div className="divide-y divide-border">
              {pendingProducts.map((product) => {
                const category = CATEGORIES.find((c) => c.slug === product.category);
                return (
                  <div key={product.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex gap-4 flex-1">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#efe8dc]">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                          <p className="text-sm text-muted mt-1">{product.description.substring(0, 100)}...</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-muted">Seller: {product.sellerName}</span>
                            <span className="text-muted">Price: {formatCents(product.priceCents)}</span>
                            <span className="text-muted">
                              Stock: {getAvailableInventory(product)}
                              {getAvailableInventory(product) === 0 ? " (Out of Stock)" : ""}
                            </span>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand mt-2">
                            {category?.name || product.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveProduct(product.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectProduct(product.id)}
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Products */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              All Products ({products.length})
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base text-muted">
                No products found.
              </p>
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
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Price
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
                        <td className="px-6 py-4 text-sm">
                          {product.sellerName}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                            {category?.name || product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {formatCents(product.priceCents)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            product.approvalStatus === "approved"
                              ? "bg-green-100 text-green-800"
                              : product.approvalStatus === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {product.approvalStatus.charAt(0).toUpperCase() + product.approvalStatus.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {product.approvalStatus === "pending" && (
                              <>
                                <button
                                  onClick={() => handleApproveProduct(product.id)}
                                  className="text-sm font-medium text-green-600 hover:text-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectProduct(product.id)}
                                  className="text-sm font-medium text-red-600 hover:text-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
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
      </div>
    </Container>
  );
}
