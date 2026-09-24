"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES } from "@/lib/constants";
import { deleteCatalogProduct, getCatalogProductsForAdmin, moderateCatalogProduct, PRODUCT_CATALOG_UPDATED_EVENT } from "@/features/products/data";
import { formatCents } from "@/lib/money";
import { getAvailableInventoryById } from "@/lib/inventory-storage";
import type { Product, ProductCategorySlug, ProductSize } from "@/types/product";
import { getDataSourceMode } from "@/lib/adapters/config";
import {
  createAdminProductInSupabase,
  deleteProductFromSupabase,
  getAdminProductsFromSupabase,
  updateAdminProductInSupabase,
  updateProductModerationInSupabase,
} from "@/lib/supabase/product-repository";

type FormState = {
  name: string; description: string; price: string; compareAt: string; category: ProductCategorySlug;
  inventory: string; imageUrl: string; sellerName: string; sellerId: string; sizes: ProductSize[];
};
const emptyForm: FormState = { name: "", description: "", price: "", compareAt: "", category: "home-living", inventory: "0", imageUrl: "", sellerName: "ShopNest", sellerId: "shopnest-admin", sizes: [] };

export function AdminProductsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [seller, setSeller] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [confirming, setConfirming] = useState<Product | null>(null);

  const useSupabase = getDataSourceMode() === "supabase" || getDataSourceMode() === "hybrid";
  const saveCatalogProduct = (product: Product) => {
    void moderateCatalogProduct(product);
  };
  const load = async () => {
    if (useSupabase) {
      try {
        setProducts(await getAdminProductsFromSupabase());
        return;
      } catch (error) {
        console.error("Unable to load Supabase admin products; retaining local catalog:", error);
      }
    }
    setProducts(getCatalogProductsForAdmin());
  };
  useEffect(() => {
    if (!user || !isAdmin) { router.push("/admin/login"); return; }
    void load();
    const refresh = () => void load();
    window.addEventListener(PRODUCT_CATALOG_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(PRODUCT_CATALOG_UPDATED_EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, [user, isAdmin, router, useSupabase]);

  const visible = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.sellerName} ${product.slug}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || product.category === category;
    const currentStatus = product.approvalStatus === "approved" ? (product.publishStatus === "published" ? "published" : "unpublished") : product.approvalStatus || "draft";
    return matchesQuery && matchesCategory && (seller === "all" || product.sellerId === seller) && (status === "all" || currentStatus === status);
  }).sort((a, b) => sort === "price-low" ? a.priceCents - b.priceCents : sort === "price-high" ? b.priceCents - a.priceCents : (b.createdAt || "").localeCompare(a.createdAt || "")), [products, query, category, seller, status, sort]);

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({ name: product.name, description: product.description, price: String(product.priceCents / 100), compareAt: product.compareAtPriceCents ? String(product.compareAtPriceCents / 100) : "", category: product.category, inventory: String(product.inventory), imageUrl: product.imageUrl, sellerName: product.sellerName, sellerId: product.sellerId, sizes: product.sizes || [] });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.description.trim() || !form.price || !form.imageUrl.trim() || !form.sellerName.trim()) return;
    const base = editing || {
      id: "", slug: "", highlights: [], gallery: [], rating: 0, reviewCount: 0, createdAt: new Date().toISOString(),
      approvalStatus: "approved" as const, publishStatus: "published" as const,
    };
    const product: Product = {
      ...base, name: form.name.trim(), slug: editing?.slug || `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`, createdAt: editing?.createdAt || new Date().toISOString(),
      description: form.description.trim(), priceCents: Math.round(Number(form.price) * 100), compareAtPriceCents: form.compareAt ? Math.round(Number(form.compareAt) * 100) : null,
      category: form.category, inventory: Math.max(0, Number(form.inventory) || 0), imageUrl: form.imageUrl.trim(), sellerName: form.sellerName.trim(), sellerId: form.sellerId.trim() || "shopnest-admin", sizes: form.sizes, updatedAt: new Date().toISOString(),
      approvalStatus: editing?.approvalStatus || "approved", publishStatus: editing?.publishStatus || "published",
    };
    if (useSupabase) {
      try {
        if (editing) await updateAdminProductInSupabase({ ...product, sellerId: editing.sellerId }, {
          name: product.name,
          description: product.description,
          highlights: product.highlights.join(", "),
          priceCents: product.priceCents,
          compareAtPriceCents: product.compareAtPriceCents,
          category: product.category,
          inventory: product.inventory,
          imageUrl: product.imageUrl,
          sizes: product.sizes || [],
          inventoryBySize: product.inventoryBySize,
        });
        else await createAdminProductInSupabase({
          name: product.name,
          description: product.description,
          highlights: product.highlights.join(", "),
          priceCents: product.priceCents,
          compareAtPriceCents: product.compareAtPriceCents,
          category: product.category,
          inventory: product.inventory,
          imageUrl: product.imageUrl,
          sizes: product.sizes || [],
          inventoryBySize: product.inventoryBySize,
        });
      } catch (error) {
        console.error("Unable to save Supabase admin product:", error);
        return;
      }
    } else {
      saveCatalogProduct({ ...product, rating: editing?.rating || 0, reviewCount: editing?.reviewCount || 0 });
    }
    setEditing(null); setForm(emptyForm); void load();
  };
  const confirmDelete = async () => {
    if (!confirming) return;
    if (useSupabase) {
      try { await deleteProductFromSupabase(confirming.id); } catch (error) { console.error("Unable to delete Supabase product:", error); return; }
    } else {
      deleteCatalogProduct(confirming.id);
    }
    setConfirming(null); void load();
  };

  return <Container className="py-8 sm:py-12"><div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Admin catalog</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Product Management</h1><p className="mt-2 text-muted">Manage every product, regardless of seller ownership.</p></div><Button onClick={() => { setEditing(null); setForm(emptyForm); }}>Add product</Button></div>
    <form onSubmit={save} className="mt-8 grid gap-3 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <input required placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3" />
      <input required placeholder="Seller name" value={form.sellerName} onChange={(e) => setForm({ ...form, sellerName: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3" />
      <input placeholder="Seller ID" value={form.sellerId} onChange={(e) => setForm({ ...form, sellerId: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3" />
      <input required placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3" />
      <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 rounded-xl border border-border bg-background px-3 py-3 sm:col-span-2" />
      <input required type="number" min="0" step="0.01" placeholder="Price (₹)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3" />
      <input type="number" min="0" step="0.01" placeholder="Original price (₹)" value={form.compareAt} onChange={(e) => setForm({ ...form, compareAt: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3" />
      <input type="number" min="0" placeholder="Inventory" value={form.inventory} onChange={(e) => setForm({ ...form, inventory: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3" />
      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategorySlug })} className="rounded-xl border border-border bg-background px-3 py-3">{CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><Button type="submit">{editing ? "Save changes" : "Create product"}</Button>{editing ? <Button type="button" variant="secondary" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</Button> : null}</div>
    </form>
    <div className="mt-8 grid gap-3 rounded-3xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"><input placeholder="Search products or sellers" value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 lg:col-span-2" /><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-3"><option value="all">All categories</option>{CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select><select value={seller} onChange={(e) => setSeller(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-3"><option value="all">All sellers</option>{[...new Map(products.map((item) => [item.sellerId, item.sellerName])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-3"><option value="all">All statuses</option>{["draft","pending","approved","rejected","published","unpublished"].map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-3"><option value="newest">Newest</option><option value="price-low">Price low</option><option value="price-high">Price high</option></select></div>
    <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-surface"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted"><tr>{["Product","Seller","Category","Price","Inventory","Status","Created","Actions"].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody className="divide-y divide-border">{visible.map((product) => { const current = product.approvalStatus === "approved" ? product.publishStatus === "published" ? "published" : "unpublished" : product.approvalStatus || "draft"; return <tr key={product.id} className="hover:bg-white/5"><td className="px-5 py-4"><div className="flex items-center gap-3"><Image src={product.imageUrl} alt="" width={52} height={52} className="h-13 w-13 rounded-xl object-cover" /><div><p className="font-semibold">{product.name}</p><p className="text-xs text-muted">{product.id}</p></div></div></td><td className="px-5 py-4">{product.sellerName}</td><td className="px-5 py-4">{CATEGORIES.find((item) => item.slug === product.category)?.name}</td><td className="px-5 py-4 font-semibold">{formatCents(product.priceCents)}</td><td className="px-5 py-4">{getAvailableInventoryById(product.id, product.inventory)}</td><td className="px-5 py-4"><span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{current}</span></td><td className="px-5 py-4 text-muted">{product.createdAt ? new Date(product.createdAt).toLocaleDateString("en-IN") : "—"}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button onClick={() => openEdit(product)} className="font-semibold text-brand hover:text-accent">Edit</button><button onClick={() => { saveCatalogProduct({ ...product, publishStatus: current !== "published" ? "published" : "unpublished" }); load(); }} className="font-semibold text-brand hover:text-accent">{current === "published" ? "Unpublish" : "Publish"}</button>{product.approvalStatus === "pending" ? <button onClick={() => { saveCatalogProduct({ ...product, approvalStatus: "approved" }); load(); }} className="font-semibold text-green-400">Approve</button> : null}<button onClick={() => setConfirming(product)} className="font-semibold text-red-400 hover:text-red-300">Delete</button></div></td></tr>; })}</tbody></table></div>{!visible.length ? <p className="p-12 text-center text-muted">No products match the current filters.</p> : null}</div>
  </div>{confirming ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl"><Image src={confirming.imageUrl} alt="" width={96} height={96} className="h-24 w-24 rounded-2xl object-cover" /><h2 className="mt-4 text-xl font-semibold">Delete {confirming.name}?</h2><p className="mt-2 text-sm text-muted">Seller: {confirming.sellerName}</p><p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">This permanently deletes the product and cannot be undone.</p><div className="mt-5 flex gap-3"><Button onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-500">Delete permanently</Button><Button variant="secondary" onClick={() => setConfirming(null)}>Cancel</Button></div></div></div> : null}</Container>;
}
