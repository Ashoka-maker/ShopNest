import type { AdminStats, AdminAction } from "@/types/admin";
import type { Seller } from "@/types/seller";
import type { SellerProduct } from "@/types/product";
import type { Order } from "@/types/order";
import type { User } from "@/types/user";
import {
  normalizeSellerProduct,
  SELLER_PRODUCTS_UPDATED_EVENT,
} from "@/lib/seller-storage";

const ADMIN_ACTIONS_KEY = "shopnest_admin_actions";
const ADMIN_CREDENTIALS_KEY = "shopnest_admin_credentials";

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

export function getAllSellerProducts(): SellerProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("shopnest_seller_products");
    return stored ? JSON.parse(stored).map(normalizeSellerProduct) : [];
  } catch {
    return [];
  }
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
