import type { Seller } from "@/types/seller";
import type { SellerProduct, ProductFormData } from "@/types/product";

const SELLERS_STORAGE_KEY = "shopnest_sellers";
const SELLER_PRODUCTS_STORAGE_KEY = "shopnest_seller_products";
export const SELLER_PRODUCTS_UPDATED_EVENT = "shopnest:seller-products-updated";
export const SELLERS_UPDATED_EVENT = "shopnest:sellers-updated";

export const normalizeSellerProduct = (product: SellerProduct): SellerProduct => {
  const approvalStatus =
    product.approvalStatus?.trim().toLowerCase() === "approved"
      ? "approved"
      : product.approvalStatus?.trim().toLowerCase() === "rejected"
        ? "rejected"
        : "pending";

  return {
    ...product,
    approvalStatus,
    publishStatus: product.publishStatus ?? (approvalStatus === "approved" ? "published" : "unpublished"),
  };
};

// Helper functions for localStorage
const getStoredSellers = (): Seller[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SELLERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveStoredSellers = (sellers: Seller[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELLERS_STORAGE_KEY, JSON.stringify(sellers));
    window.dispatchEvent(new CustomEvent(SELLERS_UPDATED_EVENT));
  } catch (e) {
    console.error("Failed to save sellers:", e);
  }
};

const getStoredSellerProducts = (): SellerProduct[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SELLER_PRODUCTS_STORAGE_KEY);
    return stored ? JSON.parse(stored).map(normalizeSellerProduct) : [];
  } catch {
    return [];
  }
};

const saveStoredSellerProducts = (products: SellerProduct[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELLER_PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent(SELLER_PRODUCTS_UPDATED_EVENT));
  } catch (e) {
    console.error("Failed to save seller products:", e);
  }
};

export function saveSeller(seller: Seller): void {
  const sellers = getStoredSellers();
  sellers.push({ verificationStatus: "pending", ...seller });
  saveStoredSellers(sellers);
}

export function getSellerByUserId(userId: string): Seller | null {
  const sellers = getStoredSellers();
  return sellers.find((seller) => seller.userId === userId) ?? null;
}

export function updateSeller(userId: string, updates: Partial<Seller>): Seller | null {
  const sellers = getStoredSellers();
  const index = sellers.findIndex((seller) => seller.userId === userId);
  
  if (index === -1) return null;
  
  sellers[index] = { ...sellers[index], ...updates };
  saveStoredSellers(sellers);
  return sellers[index];
}

export function updateSellerProfile(
  userId: string,
  updates: Pick<Seller, "storeName" | "bio" | "logoUrl" | "contactEmail" | "contactPhone">,
): Seller | null {
  return updateSeller(userId, {
    storeName: updates.storeName.trim(),
    bio: updates.bio.trim(),
    logoUrl: updates.logoUrl?.trim() || undefined,
    contactEmail: updates.contactEmail?.trim() || undefined,
    contactPhone: updates.contactPhone?.trim() || undefined,
  });
}

export function getSellerById(sellerId: string): Seller | null {
  return getStoredSellers().find((seller) => seller.id === sellerId) ?? null;
}

export function getAllSellers(): Seller[] {
  return getStoredSellers().filter((seller) => seller.isActive && seller.approvalStatus === "approved");
}

export function generateSellerId(): string {
  return "seller-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
}

export function generateProductId(): string {
  return "p-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function saveSellerProduct(product: SellerProduct, expectedSellerId?: string): boolean {
  if (expectedSellerId && product.sellerId !== expectedSellerId) return false;
  const products = getStoredSellerProducts();
  const existingIndex = products.findIndex((p) => p.id === product.id);
  
  if (existingIndex >= 0) {
    if (expectedSellerId && products[existingIndex].sellerId !== expectedSellerId) return false;
    products[existingIndex] = product;
  } else {
    products.push(product);
  }
  
  saveStoredSellerProducts(products.map(normalizeSellerProduct));
  return true;
}

export function getSellerProducts(sellerId: string): SellerProduct[] {
  const products = getStoredSellerProducts();
  if (!sellerId) return products; // Return all products if no sellerId provided
  return products.filter((product) => product.sellerId === sellerId);
}

export function getSellerProductById(productId: string): SellerProduct | null {
  const products = getStoredSellerProducts();
  return products.find((product) => product.id === productId) ?? null;
}

export function deleteSellerProduct(productId: string, expectedSellerId?: string): boolean {
  const products = getStoredSellerProducts();
  const product = products.find((item) => item.id === productId);
  if (!product || (expectedSellerId && product.sellerId !== expectedSellerId)) return false;
  const filtered = products.filter((product) => product.id !== productId);
  
  if (filtered.length === products.length) return false;
  
  saveStoredSellerProducts(filtered);
  return true;
}

export function createSellerProductFromData(
  data: ProductFormData,
  sellerId: string,
  sellerName: string
): SellerProduct {
  const id = generateProductId();
  const slug = generateSlug(data.name);
  const now = new Date().toISOString();
  
  const imageUrl = data.imageUrl || `https://picsum.photos/seed/${slug}/1200/900`;
  const gallery = [`https://picsum.photos/seed/${slug}-gallery/1200/900`];
  
  return {
    id,
    slug,
    sellerId,
    sellerName,
    name: data.name,
    description: data.description,
    highlights: data.highlights.split(",").map(h => h.trim()).filter(h => h.length > 0),
    priceCents: data.priceCents,
    compareAtPriceCents: data.compareAtPriceCents,
    imageUrl,
    gallery,
    category: data.category,
    inventory: data.inventory,
    createdAt: now,
    updatedAt: now,
    approvalStatus: "pending",
    publishStatus: "unpublished",
    sizes: data.sizes,
  };
}

export function updateSellerProductFromData(
  existingProduct: SellerProduct,
  data: ProductFormData
): SellerProduct {
  const now = new Date().toISOString();
  
  return {
    ...existingProduct,
    name: data.name,
    description: data.description,
    highlights: data.highlights.split(",").map(h => h.trim()).filter(h => h.length > 0),
    priceCents: data.priceCents,
    compareAtPriceCents: data.compareAtPriceCents,
    category: data.category,
    inventory: data.inventory,
    imageUrl: data.imageUrl || existingProduct.imageUrl,
    sizes: data.sizes,
    updatedAt: now,
  };
}
