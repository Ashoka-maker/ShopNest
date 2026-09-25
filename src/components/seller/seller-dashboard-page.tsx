"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getSellerByUserId, getSellerProducts, deleteSellerProduct, updateSellerProfile, updateSeller } from "@/lib/seller-storage";
import type { Seller } from "@/types/seller";
import type { SellerProduct } from "@/types/product";
import { formatCents } from "@/lib/money";
import { CATEGORIES } from "@/lib/constants";
import { SellerOrdersSection } from "@/components/seller/seller-orders-section";
import { SellerReviewsSection } from "@/components/seller/seller-reviews-section";
import { SellerReturnRequestsSection } from "@/components/seller/seller-return-requests-section";
import { SellerSupportSection } from "@/components/seller/seller-support-section";
import { getAllOrders } from "@/lib/order-storage";
import { getAvailableInventory, getSoldQuantity } from "@/lib/inventory-storage";
import { getDataSourceMode } from "@/lib/adapters/config";
import { deleteProductFromSupabase, getSellerFromSupabase, getSellerIdForUser, getSellerProductsFromSupabase, updateSellerProfileInSupabase } from "@/lib/supabase/product-repository";

export function SellerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileMessage, setProfileMessage] = useState("");
  const useSupabase = getDataSourceMode() === "supabase" || getDataSourceMode() === "hybrid";
  const [supabaseSellerId, setSupabaseSellerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/signin");
      return;
    }

    const loadSellerData = async () => {
      const sellerData = getSellerByUserId(user.id);
      if (!sellerData) {
        router.push("/seller/register");
        return;
      }
      setSeller(sellerData);

      if (useSupabase) {
        try {
          const remoteSellerId = sellerData.supabaseSellerId ?? await getSellerIdForUser(user.id);
          if (!remoteSellerId) {
            setProducts(getSellerProducts(sellerData.id));
            setLoading(false);
            return;
          }
          const remoteSeller = await getSellerFromSupabase(user.id);
          if (!remoteSeller) throw new Error("Supabase seller profile was not found after identity mapping");
          const mappedSeller = {
            ...sellerData,
            supabaseSellerId: remoteSellerId,
            storeName: remoteSeller.store_name,
            bio: remoteSeller.bio ?? "",
            logoUrl: remoteSeller.logo_url ?? undefined,
            contactEmail: remoteSeller.contact_email ?? undefined,
            contactPhone: remoteSeller.contact_phone ?? undefined,
            approvalStatus: remoteSeller.approval_status,
            isActive: remoteSeller.is_active,
            verificationStatus: remoteSeller.verification_status,
            verificationNote: remoteSeller.verification_note ?? undefined,
            createdAt: remoteSeller.created_at,
          };
          updateSeller(user.id, mappedSeller);
          setSeller(mappedSeller);
          setSupabaseSellerId(remoteSellerId);
          if (remoteSellerId) {
            const remoteProducts = await getSellerProductsFromSupabase(remoteSellerId);
            setProducts(remoteProducts.map((product) => ({
              ...product,
              sellerId: remoteSellerId,
              sellerName: mappedSeller.storeName,
              createdAt: product.createdAt ?? new Date().toISOString(),
              updatedAt: product.updatedAt ?? new Date().toISOString(),
              approvalStatus: product.approvalStatus ?? "pending",
            })));
          } else {
            setProducts(getSellerProducts(sellerData.id));
          }
        } catch (error) {
          console.error("Unable to load Supabase seller products:", error);
          setProducts([]);
        }
      } else {
        setProducts(getSellerProducts(sellerData.id));
      }
      setLoading(false);
    };

    void loadSellerData();
  }, [user, router, useSupabase]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    let success = false;
    if (useSupabase && supabaseSellerId) {
      try {
        await deleteProductFromSupabase(productId);
        success = true;
      } catch (error) {
        console.error("Unable to delete Supabase seller product:", error);
      }
    } else {
      success = seller ? deleteSellerProduct(productId, seller.id) : false;
    }
    if (success && seller) {
      if (useSupabase && supabaseSellerId) {
        setProducts(products.filter((product) => product.id !== productId));
      } else {
        setProducts(getSellerProducts(seller.id));
      }
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
  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!seller) return;
    const form = new FormData(event.currentTarget);
    const updates = {
      storeName: String(form.get("storeName") || ""),
      bio: String(form.get("bio") || ""),
      logoUrl: String(form.get("logoUrl") || ""),
      contactEmail: String(form.get("contactEmail") || ""),
      contactPhone: String(form.get("contactPhone") || ""),
    };

    try {
      if (useSupabase && seller.supabaseSellerId) {
        const remoteSeller = await updateSellerProfileInSupabase(seller.supabaseSellerId, updates);
        const updated = updateSeller(seller.userId, {
          supabaseSellerId: remoteSeller.id,
          storeName: remoteSeller.store_name,
          bio: remoteSeller.bio ?? "",
          logoUrl: remoteSeller.logo_url ?? undefined,
          contactEmail: remoteSeller.contact_email ?? undefined,
          contactPhone: remoteSeller.contact_phone ?? undefined,
        });
        setProfileMessage(updated ? "Store profile updated." : "Unable to update store profile.");
        if (updated) setSeller(updated);
      } else {
        const updated = updateSellerProfile(seller.userId, updates);
        setProfileMessage(updated ? "Store profile updated." : "Unable to update store profile.");
        if (updated) setSeller(updated);
      }
    } catch (error) {
      console.error("Unable to update Supabase seller profile:", error);
      setProfileMessage("Unable to update store profile.");
    }
  };

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
        <SellerReturnRequestsSection sellerId={seller.id} />
        <SellerSupportSection sellerId={seller.id} userId={user?.id || seller.userId} userName={user?.name || seller.storeName} />
        <SellerReviewsSection sellerId={seller.id} />

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Seller Profile / Store Settings</h2>
              <p className="mt-1 text-sm text-muted">Verification is controlled by ShopNest administrators.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${seller.verificationStatus === "verified" ? "bg-blue-100 text-blue-700" : seller.verificationStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
              {seller.verificationStatus === "verified" ? "Verified" : seller.verificationStatus === "rejected" ? "Rejected" : "Pending verification"}
            </span>
          </div>
          {seller.verificationNote ? <p className="mt-3 rounded-lg bg-background p-3 text-sm text-muted">Admin note: {seller.verificationNote}</p> : null}
          <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Store name<input name="storeName" defaultValue={seller.storeName} required className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium">Logo URL (optional)<input name="logoUrl" defaultValue={seller.logoUrl || ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium">Contact email<input name="contactEmail" type="email" defaultValue={seller.contactEmail || ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium">Contact phone<input name="contactPhone" defaultValue={seller.contactPhone || ""} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium sm:col-span-2">Store description<textarea name="bio" defaultValue={seller.bio} required rows={4} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal" /></label>
            <div className="sm:col-span-2 flex items-center gap-3"><Button type="submit">Save profile</Button>{profileMessage ? <span className="text-sm text-brand">{profileMessage}</span> : null}</div>
          </form>
        </section>

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
