"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { 
  getSellerByUserId, 
  getSellerProductById, 
  saveSellerProduct,
  createSellerProductFromData,
  updateSellerProductFromData 
} from "@/lib/seller-storage";
import { CATEGORIES } from "@/lib/constants";
import { formatCents } from "@/lib/money";
import { PRODUCT_SIZES, type Product, type ProductFormData, type SellerProduct } from "@/types/product";
import { getDataSourceMode } from "@/lib/adapters/config";
import {
  createSellerProductInSupabase,
  ensureSellerInSupabase,
  getSellerIdForUser,
  getSellerProductsFromSupabase,
  updateSellerProductInSupabase,
} from "@/lib/supabase/product-repository";

type ProductFormPageProps = {
  mode: "create" | "edit";
  params?: Promise<{ id: string }>;
};

export function ProductFormPage({ mode, params }: ProductFormPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [seller, setSeller] = useState<any>(null);
  const [existingProduct, setExistingProduct] = useState<SellerProduct | null>(null);
  const [supabaseSellerId, setSupabaseSellerId] = useState<string | null>(null);
  const [supabaseProductId, setSupabaseProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState("");
  const [persistenceError, setPersistenceError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    highlights: "",
    priceCents: 0,
    compareAtPriceCents: null,
    category: "home-living",
    inventory: 0,
    imageUrl: "",
    sizes: [],
    inventoryBySize: {},
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        router.push("/signin");
        return;
      }

      const sellerData = getSellerByUserId(user.id);
      if (!sellerData) {
        router.push("/seller/register");
        return;
      }
      setSeller(sellerData);

      const useSupabase = getDataSourceMode() === "supabase" || getDataSourceMode() === "hybrid";
      let remoteProduct: Product | null = null;
      if (useSupabase) {
        try {
          const remoteSellerId = sellerData.supabaseSellerId ?? await ensureSellerInSupabase(user.id, sellerData.storeName, sellerData.bio);
          setSupabaseSellerId(remoteSellerId);
          if (remoteSellerId && mode === "edit") {
            const remoteProducts = await getSellerProductsFromSupabase(remoteSellerId);
            const requestedId = (await params)?.id ?? "";
            const localProduct = getSellerProductById(requestedId);
            remoteProduct = remoteProducts.find((product) => product.id === requestedId)
              ?? remoteProducts.find((product) => product.slug === localProduct?.slug)
              ?? null;
            setSupabaseProductId(remoteProduct?.id ?? null);
          }
        } catch (error) {
          console.error("Unable to load Supabase seller mapping:", error);
          setPersistenceError(error instanceof Error ? error.message : "Unable to connect to Supabase.");
          setLoading(false);
          return;
        }
      }

      if (mode === "edit" && params) {
        const { id } = await params;
        const product = getSellerProductById(id);
        const productToEdit = remoteProduct ?? product;
        if (!productToEdit || (!remoteProduct && productToEdit.sellerId !== sellerData.id)) {
          router.push("/seller/dashboard");
          return;
        }
        setExistingProduct(remoteProduct ? null : product);
        setFormData({
          name: productToEdit.name,
          description: productToEdit.description,
          highlights: productToEdit.highlights.join(", "),
          priceCents: productToEdit.priceCents,
          compareAtPriceCents: productToEdit.compareAtPriceCents,
          category: productToEdit.category,
          inventory: productToEdit.sizes?.length
            ? productToEdit.sizes.reduce((total, size) => total + (productToEdit.inventoryBySize?.[size] ?? 0), 0)
            : productToEdit.inventory,
          imageUrl: productToEdit.imageUrl,
          sizes: productToEdit.sizes ?? [],
          inventoryBySize: productToEdit.inventoryBySize ?? {},
        });
      }

      setLoading(false);
    };

    loadData();
  }, [user, router, mode, params]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "priceCents" || name === "compareAtPriceCents" || name === "inventory") {
      setFormData((prev) => ({ 
        ...prev, 
        [name]: value === "" ? 0 : parseInt(value) || 0 
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      setImageError("Please choose an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      e.target.value = "";
      setImageError("Image must be 2 MB or smaller.");
      return;
    }

    setImageError("");
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result;
      if (typeof imageUrl === "string") {
        setFormData((prev) => ({ ...prev, imageUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPersistenceError("");

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const supabaseMode = getDataSourceMode() === "supabase" || getDataSourceMode() === "hybrid";
      if (supabaseMode && !supabaseSellerId) {
        throw new Error("Supabase seller identity is unavailable; product was not saved.");
      }
      const remoteSellerId = supabaseSellerId ?? "";

      if (supabaseMode && mode === "create") {
        const cachedProduct = createSellerProductFromData(formData, seller.id, seller.storeName);
        const remoteProduct = await createSellerProductInSupabase(formData, remoteSellerId, cachedProduct.slug);
        saveSellerProduct({
          ...cachedProduct,
          id: remoteProduct.id,
          sellerName: seller.storeName,
          name: remoteProduct.name,
          description: remoteProduct.description,
          highlights: remoteProduct.highlights,
          priceCents: remoteProduct.priceCents,
          compareAtPriceCents: remoteProduct.compareAtPriceCents,
          imageUrl: remoteProduct.imageUrl,
          gallery: remoteProduct.gallery,
          inventory: remoteProduct.inventory,
          sizes: remoteProduct.sizes,
          inventoryBySize: remoteProduct.inventoryBySize,
          createdAt: remoteProduct.createdAt ?? cachedProduct.createdAt,
          updatedAt: remoteProduct.updatedAt ?? cachedProduct.updatedAt,
          approvalStatus: remoteProduct.approvalStatus ?? "pending",
          publishStatus: remoteProduct.publishStatus ?? "unpublished",
        });
      } else if (supabaseMode && mode === "edit" && remoteSellerId) {
        const cachedProduct = existingProduct ?? createSellerProductFromData(formData, seller.id, seller.storeName);
        const remoteProduct = supabaseProductId
          ? await updateSellerProductInSupabase(supabaseProductId, formData, remoteSellerId)
          : await createSellerProductInSupabase(
            formData,
            remoteSellerId,
            cachedProduct.slug,
            cachedProduct.approvalStatus,
            cachedProduct.publishStatus,
          );
        saveSellerProduct({
          ...cachedProduct,
          id: remoteProduct.id,
          sellerName: seller.storeName,
          name: remoteProduct.name,
          description: remoteProduct.description,
          highlights: remoteProduct.highlights,
          priceCents: remoteProduct.priceCents,
          compareAtPriceCents: remoteProduct.compareAtPriceCents,
          imageUrl: remoteProduct.imageUrl,
          gallery: remoteProduct.gallery,
          inventory: remoteProduct.inventory,
          sizes: remoteProduct.sizes,
          inventoryBySize: remoteProduct.inventoryBySize,
          createdAt: remoteProduct.createdAt ?? cachedProduct.createdAt,
          updatedAt: remoteProduct.updatedAt ?? cachedProduct.updatedAt,
          approvalStatus: remoteProduct.approvalStatus ?? "pending",
          publishStatus: remoteProduct.publishStatus ?? "unpublished",
        }, seller.id, cachedProduct.id);
      } else if (mode === "create") {
        const newProduct = createSellerProductFromData(formData, seller.id, seller.storeName);
        saveSellerProduct(newProduct, seller.id);
      } else if (mode === "edit" && existingProduct) {
        const updatedProduct = updateSellerProductFromData(existingProduct, formData);
        saveSellerProduct(updatedProduct, seller.id);
      }

      router.push("/seller/dashboard");
    } catch (error) {
      console.error("Error saving product:", error);
      setPersistenceError(error instanceof Error ? error.message : "Unable to save product to Supabase.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
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
      <div className="mx-auto max-w-2xl">
        {persistenceError ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{persistenceError}</p> : null}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {mode === "create" ? "Add New Product" : "Edit Product"}
          </h1>
          <p className="mt-2 text-base text-muted">
            {mode === "create" 
              ? "Fill in the details to add a new product to your store" 
              : "Update your product information"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                placeholder="Premium Cotton T-Shirt"
              />
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium mb-2">
                Product Image
              </label>
              <input
                type="file"
                id="image"
                name="image"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
              />
              <p className="mt-1 text-xs text-muted">Upload an image up to 2 MB.</p>
              {imageError ? <p className="mt-1 text-sm text-red-600">{imageError}</p> : null}
              {formData.imageUrl ? (
                <img
                  src={formData.imageUrl}
                  alt="Product preview"
                  className="mt-3 h-40 w-full rounded-xl object-cover"
                />
              ) : null}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-brand/20 resize-none"
                placeholder="Describe your product in detail..."
              />
            </div>

            <div>
              <label htmlFor="highlights" className="block text-sm font-medium mb-2">
                Key Features (comma-separated) *
              </label>
              <input
                type="text"
                id="highlights"
                name="highlights"
                required
                value={formData.highlights}
                onChange={handleInputChange}
                className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                placeholder="100% cotton, Machine washable, Available in multiple colors"
              />
              <p className="mt-1 text-xs text-muted">
                Separate features with commas
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                value={formData.category}
                onChange={handleInputChange}
                className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
              >
                {CATEGORIES.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing */}
            <div>
              <p className="block text-sm font-medium mb-2">Available Sizes</p>
              <div className="flex flex-wrap gap-3">
                {PRODUCT_SIZES.map((size) => (
                  <label key={size} className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.sizes.includes(size)}
                      onChange={(event) => setFormData((prev) => {
                        const sizes = event.target.checked
                          ? [...prev.sizes, size]
                          : prev.sizes.filter((item) => item !== size);
                        const inventoryBySize = { ...(prev.inventoryBySize || {}) };
                        if (!event.target.checked) delete inventoryBySize[size];
                        const inventory = sizes.reduce((total, selectedSize) => total + (inventoryBySize[selectedSize] ?? 0), 0);
                        return { ...prev, sizes, inventoryBySize, inventory };
                      })}
                    />
                    {size}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                Leave all unchecked for products without size variants.
              </p>
              {formData.sizes.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {formData.sizes.map((size) => (
                    <label key={size} className="grid gap-1 text-sm font-medium">
                      {size} stock
                      <input
                        type="number"
                        min="0"
                        value={formData.inventoryBySize?.[size] ?? 0}
                        onChange={(event) => setFormData((prev) => ({
                          ...prev,
                          inventoryBySize: { ...(prev.inventoryBySize || {}), [size]: Math.max(0, Number(event.target.value) || 0) },
                          inventory: Object.values({ ...(prev.inventoryBySize || {}), [size]: Math.max(0, Number(event.target.value) || 0) }).reduce((total, value) => total + (value || 0), 0),
                        }))}
                        className="h-10 rounded-lg border border-border bg-white px-3"
                      />
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="priceCents" className="block text-sm font-medium mb-2">
                  Price (INR) *
                </label>
                <input
                  type="number"
                  id="priceCents"
                  name="priceCents"
                  required
                  min="0"
                  step="0.01"
                  value={formData.priceCents / 100}
                  onChange={(e) => handleInputChange({
                    ...e,
                    target: { ...e.target, name: "priceCents", value: (parseFloat(e.target.value) * 100).toString() }
                  })}
                  className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                  placeholder="29.99"
                />
              </div>
              <div>
                <label htmlFor="compareAtPriceCents" className="block text-sm font-medium mb-2">
                  Compare at Price (INR)
                </label>
                <input
                  type="number"
                  id="compareAtPriceCents"
                  name="compareAtPriceCents"
                  min="0"
                  step="0.01"
                  value={formData.compareAtPriceCents ? formData.compareAtPriceCents / 100 : ""}
                  onChange={(e) => handleInputChange({
                    ...e,
                    target: { ...e.target, name: "compareAtPriceCents", value: e.target.value ? (parseFloat(e.target.value) * 100).toString() : "" }
                  })}
                  className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                  placeholder="39.99"
                />
              </div>
            </div>

            {/* Inventory */}
            <div>
              <label htmlFor="inventory" className="block text-sm font-medium mb-2">
                Inventory Count *
              </label>
              <input
                type="number"
                id="inventory"
                name="inventory"
                required
                min="0"
                value={formData.inventory}
                onChange={handleInputChange}
                className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                placeholder="100"
              />
            </div>

            {/* Preview */}
            {formData.name && (
              <div className="bg-brand/5 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-2">Product Preview</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted">Name:</span> {formData.name}</p>
                  <p><span className="text-muted">Price:</span> {formatCents(formData.priceCents)}</p>
                  {formData.compareAtPriceCents && (
                    <p><span className="text-muted">Compare at:</span> {formatCents(formData.compareAtPriceCents)}</p>
                  )}
                  <p><span className="text-muted">Category:</span> {CATEGORIES.find(c => c.slug === formData.category)?.name}</p>
                  <p><span className="text-muted">Inventory:</span> {formData.inventory}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? "Saving..." 
                  : mode === "create" 
                    ? "Add Product" 
                    : "Update Product"}
              </Button>
              <Link
                href="/seller/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </Container>
  );
}
