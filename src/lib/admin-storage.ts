import type { AdminStats, AdminAction } from "@/types/admin";
import type { Seller } from "@/types/seller";
import type { Product, SellerProduct, ProductCategorySlug, ProductSize } from "@/types/product";
import type { Order } from "@/types/order";
import type { User } from "@/types/user";
import {
  normalizeSellerProduct,
  SELLER_PRODUCTS_UPDATED_EVENT,
} from "@/lib/seller-storage";

const ADMIN_ACTIONS_KEY = "shopnest_admin_actions";
const ADMIN_CREDENTIALS_KEY = "shopnest_admin_credentials";
const ADMIN_PRODUCTS_KEY = "shopnest_admin_products";
const ADMIN_PRODUCT_OVERRIDES_KEY = "shopnest_product_overrides";
const ADMIN_DELETED_PRODUCTS_KEY = "shopnest_deleted_products";
export const ADMIN_PRODUCTS_UPDATED_EVENT = "shopnest:admin-products-updated";

// Admin credentials (demo purposes)
const ADMIN_EMAIL = "admin@shopnest.com";
const ADMIN_PASSWORD = "admin123";

// Helper functions for localStorage
const getStoredAdminActions = (): AdminAction[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(ADMIN_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveStoredAdminActions = (actions: AdminAction[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_ACTIONS_KEY, JSON.stringify(actions));
  } catch (e) {
    console.error("Failed to save admin actions:", e);
  }
};

export function validateAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function logAdminAction(action: Omit<AdminAction, "id" | "timestamp">): void {
  const actions = getStoredAdminActions();
  const newAction: AdminAction = {
    ...action,
    id: "action-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
  };
  actions.unshift(newAction); // Add to beginning
  
  // Keep only last 100 actions
  if (actions.length > 100) {
    actions.pop();
  }
  
  saveStoredAdminActions(actions);
}

export function getAdminStats(): AdminStats {
  // Get all entities from their respective storage
  const users = JSON.parse(localStorage.getItem("shopnest_users") || "[]");
  const sellers = JSON.parse(localStorage.getItem("shopnest_sellers") || "[]");
  const sellerProducts = JSON.parse(localStorage.getItem("shopnest_seller_products") || "[]")
    .map(normalizeSellerProduct);
  const orders = JSON.parse(localStorage.getItem("shopnest_orders") || "[]");

  const pendingSellers = sellers.filter((s: Seller) => s.approvalStatus === "pending").length;
  const pendingProducts = sellerProducts.filter((p: SellerProduct) => p.approvalStatus === "pending").length;
  const totalRevenue = orders.reduce((sum: number, order: Order) => sum + order.totalCents, 0);

  return {
    totalUsers: users.length,
    totalSellers: sellers.length,
    totalProducts: sellerProducts.length,
    totalOrders: orders.length,
    pendingSellers,
    pendingProducts,
    totalRevenue,
  };
}

export function getAllUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("shopnest_users");
    const users = stored ? JSON.parse(stored) : [];
    return users.map((u: any) => {
      // Handle both users with and without passwords
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  } catch {
    return [];
  }
}

export function deleteUser(userId: string): boolean {
  const users = JSON.parse(localStorage.getItem("shopnest_users") || "[]");
  const filtered = users.filter((u: any) => u.id !== userId);
  
  if (filtered.length === users.length) return false;
  
  localStorage.setItem("shopnest_users", JSON.stringify(filtered));
  logAdminAction({
    type: "user_created", // Reusing this for deletion
    description: `Deleted user ${userId}`,
    targetId: userId,
  });
  return true;
}

export function getAllSellers(): Seller[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("shopnest_sellers");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function approveSeller(sellerId: string): boolean {
  const sellers = getAllSellers();
  const index = sellers.findIndex((s) => s.id === sellerId);
  
  if (index === -1) return false;
  
  sellers[index].approvalStatus = "approved";
  sellers[index].isActive = true;
  
  localStorage.setItem("shopnest_sellers", JSON.stringify(sellers));
  
  logAdminAction({
    type: "seller_approved",
    description: `Approved seller ${sellers[index].storeName}`,
    targetId: sellerId,
  });
  
  return true;
}

export function rejectSeller(sellerId: string): boolean {
  const sellers = getAllSellers();
  const index = sellers.findIndex((s) => s.id === sellerId);
  
  if (index === -1) return false;
  
  sellers[index].approvalStatus = "rejected";
  sellers[index].isActive = false;
  
  localStorage.setItem("shopnest_sellers", JSON.stringify(sellers));
  
  logAdminAction({
    type: "seller_rejected",
    description: `Rejected seller ${sellers[index].storeName}`,
    targetId: sellerId,
  });
  
  return true;
}

export function toggleSellerActive(sellerId: string): boolean {
  const sellers = getAllSellers();
  const index = sellers.findIndex((s) => s.id === sellerId);
  
  if (index === -1) return false;
  
  sellers[index].isActive = !sellers[index].isActive;
  
  localStorage.setItem("shopnest_sellers", JSON.stringify(sellers));
  
  logAdminAction({
    type: "seller_approved", // Reusing for toggle
    description: `${sellers[index].isActive ? "Activated" : "Deactivated"} seller ${sellers[index].storeName}`,
    targetId: sellerId,
  });
  
  return true;
}

export function updateSellerVerification(
  sellerId: string,
  status: "pending" | "verified" | "rejected",
  note?: string,
): boolean {
  const sellers = getAllSellers();
  const index = sellers.findIndex((seller) => seller.id === sellerId);
  if (index < 0) return false;
  sellers[index] = {
    ...sellers[index],
    verificationStatus: status,
    verificationNote: note?.trim() || undefined,
  };
  localStorage.setItem("shopnest_sellers", JSON.stringify(sellers));
  window.dispatchEvent(new CustomEvent("shopnest:sellers-updated"));
  logAdminAction({
    type: status === "verified" ? "seller_approved" : "seller_rejected",
    description: `${status === "verified" ? "Verified" : status === "rejected" ? "Rejected" : "Reset verification for"} seller ${sellers[index].storeName}`,
    targetId: sellerId,
  });
  return true;
}

export function getAllSellerProducts(): SellerProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("shopnest_seller_products");
    return stored ? JSON.parse(stored).map(normalizeSellerProduct) : [];
  } catch {
    return [];
  }
}

  function getAdminProducts(): SellerProduct[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(ADMIN_PRODUCTS_KEY) || "[]"); } catch { return []; }
  }

  function saveAdminProducts(products: SellerProduct[]) {
    localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent(ADMIN_PRODUCTS_UPDATED_EVENT));
  }

  export function getAdminProductOverrides(): Record<string, Product> {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(ADMIN_PRODUCT_OVERRIDES_KEY) || "{}"); } catch { return {}; }
  }

  export function getDeletedProductIds(): string[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(ADMIN_DELETED_PRODUCTS_KEY) || "[]"); } catch { return []; }
  }

  export function getAllAdminCatalogProducts(): Product[] {
    return [...getAllSellerProducts(), ...getAdminProducts()].map((product) => ({
      ...product,
      rating: Number("rating" in product ? (product as { rating?: number }).rating ?? 0 : 0),
      reviewCount: Number("reviewCount" in product ? (product as { reviewCount?: number }).reviewCount ?? 0 : 0),
      approvalStatus: product.approvalStatus,
      publishStatus: product.publishStatus ?? (product.approvalStatus === "approved" ? "published" : "unpublished"),
    }));
  }

  export function saveAdminProduct(product: SellerProduct): boolean {
    const products = getAdminProducts();
    const index = products.findIndex((item) => item.id === product.id);
    if (index >= 0) products[index] = product;
    else products.push(product);
    saveAdminProducts(products);
    return true;
  }

  export function updateAdminCatalogProduct(product: Product): boolean {
    const sellerProducts = getAllSellerProducts();
    const sellerIndex = sellerProducts.findIndex((item) => item.id === product.id);
    if (sellerIndex >= 0) {
      sellerProducts[sellerIndex] = { ...sellerProducts[sellerIndex], ...product, updatedAt: new Date().toISOString() };
      localStorage.setItem("shopnest_seller_products", JSON.stringify(sellerProducts));
      window.dispatchEvent(new CustomEvent(SELLER_PRODUCTS_UPDATED_EVENT));
      return true;
    }
    const adminProducts = getAdminProducts();
    if (adminProducts.some((item) => item.id === product.id)) return saveAdminProduct(product as unknown as SellerProduct);
    const overrides = getAdminProductOverrides();
    overrides[product.id] = product;
    localStorage.setItem(ADMIN_PRODUCT_OVERRIDES_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent(ADMIN_PRODUCTS_UPDATED_EVENT));
    return true;
  }

  export function setProductPublished(productId: string, published: boolean): boolean {
    const product = getAllAdminCatalogProducts().find((item) => item.id === productId);
    if (!product) return false;
    return updateAdminCatalogProduct({ ...product, publishStatus: published ? "published" : "unpublished" });
  }

  export function deleteAnyProduct(productId: string): boolean {
    const sellerProducts = getAllSellerProducts().filter((item) => item.id !== productId);
    const adminProducts = getAdminProducts().filter((item) => item.id !== productId);
    const existed = sellerProducts.length !== getAllSellerProducts().length || adminProducts.length !== getAdminProducts().length;
    if (existed) {
      localStorage.setItem("shopnest_seller_products", JSON.stringify(sellerProducts));
      saveAdminProducts(adminProducts);
      window.dispatchEvent(new CustomEvent(SELLER_PRODUCTS_UPDATED_EVENT));
      return true;
    }
    const deleted = new Set(getDeletedProductIds());
    if (deleted.has(productId)) return false;
    deleted.add(productId);
    localStorage.setItem(ADMIN_DELETED_PRODUCTS_KEY, JSON.stringify([...deleted]));
    window.dispatchEvent(new CustomEvent(ADMIN_PRODUCTS_UPDATED_EVENT));
    return true;
  }

  export function createAdminProduct(input: SellerProduct): SellerProduct {
    const id = `admin-product-${Date.now()}`;
    const product: SellerProduct = {
      ...input, id: input.id || id, slug: input.slug || `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      highlights: input.highlights || [], gallery: input.gallery || [], createdAt: input.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      approvalStatus: input.approvalStatus || "approved", publishStatus: input.publishStatus || "published",
    };
    saveAdminProduct(product);
    return product;
  }
export function approveProduct(productId: string): boolean {
  const products = getAllSellerProducts();
  const index = products.findIndex((p) => p.id === productId);
  
  if (index === -1) return false;
  
  products[index].approvalStatus = "approved";
  
  localStorage.setItem("shopnest_seller_products", JSON.stringify(products));
  window.dispatchEvent(new CustomEvent(SELLER_PRODUCTS_UPDATED_EVENT));
  
  logAdminAction({
    type: "product_approved",
    description: `Approved product ${products[index].name}`,
    targetId: productId,
  });
  
  return true;
}

export function rejectProduct(productId: string): boolean {
  const products = getAllSellerProducts();
  const index = products.findIndex((p) => p.id === productId);
  
  if (index === -1) return false;
  
  products[index].approvalStatus = "rejected";
  
  localStorage.setItem("shopnest_seller_products", JSON.stringify(products));
  window.dispatchEvent(new CustomEvent(SELLER_PRODUCTS_UPDATED_EVENT));
  
  logAdminAction({
    type: "product_rejected",
    description: `Rejected product ${products[index].name}`,
    targetId: productId,
  });
  
  return true;
}

export function deleteProduct(productId: string): boolean {
  const products = getAllSellerProducts();
  const filtered = products.filter((p) => p.id !== productId);
  
  if (filtered.length === products.length) return false;
  
  localStorage.setItem("shopnest_seller_products", JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent(SELLER_PRODUCTS_UPDATED_EVENT));
  
  logAdminAction({
    type: "product_approved", // Reusing for deletion
    description: `Deleted product ${productId}`,
    targetId: productId,
  });
  
  return true;
}

export function getAllOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("shopnest_orders");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function updateOrderStatus(orderId: string, status: Order["status"]): boolean {
  const orders = getAllOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  
  if (index === -1) return false;
  
  orders[index].status = status;
  
  localStorage.setItem("shopnest_orders", JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent("shopnest:orders-updated"));
  
  logAdminAction({
    type: "order_placed", // Reusing for status update
    description: `Updated order ${orderId} to ${status}`,
    targetId: orderId,
  });
  
  return true;
}

export function getRecentAdminActions(limit = 20): AdminAction[] {
  return getStoredAdminActions().slice(0, limit);
}
