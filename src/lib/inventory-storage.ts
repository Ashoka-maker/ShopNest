import type { Order } from "@/types/order";
import { getAllProducts } from "@/features/products/data";
import {
  getSellerProductById,
  saveSellerProduct,
} from "@/lib/seller-storage";
import type { Product, ProductSize } from "@/types/product";

const INVENTORY_OVERRIDES_KEY = "shopnest_inventory_overrides";

type InventoryOverride = Record<string, number>;

function getOverrides(): InventoryOverride {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(INVENTORY_OVERRIDES_KEY) || "{}") as InventoryOverride;
  } catch {
    return {};
  }
}

function saveOverrides(overrides: InventoryOverride) {
  localStorage.setItem(INVENTORY_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getAvailableInventory(product: Pick<Product, "id" | "inventory" | "sizes" | "inventoryBySize">): number {
  if (product.inventoryBySize && Object.keys(product.inventoryBySize).length > 0) {
    return Object.values(product.inventoryBySize).reduce((total, quantity) => total + Math.max(0, quantity ?? 0), 0);
  }
  if (product.sizes?.length) {
    return product.sizes.reduce((total, size) => total + getAvailableInventoryForSize(product, size), 0);
  }
  return Math.max(0, product.inventory);
}

export function getAvailableInventoryById(product: Pick<Product, "id" | "inventory" | "sizes" | "inventoryBySize">): number;
export function getAvailableInventoryById(productId: string, fallback: number): number;
export function getAvailableInventoryById(
  productOrId: Pick<Product, "id" | "inventory" | "sizes" | "inventoryBySize"> | string,
  fallback?: number,
): number {
  if (typeof productOrId === "string") {
    return Math.max(0, fallback ?? 0);
  }
  return getAvailableInventory(productOrId);
}

export function getAvailableInventoryForSize(
  product: Pick<Product, "inventoryBySize">,
  size: ProductSize,
): number {
  return Math.max(0, product.inventoryBySize?.[size] ?? 0);
}

export function getSoldQuantity(productId: string, orders: Order[]): number {
  return orders
    .filter((order) => order.status !== "cancelled" && order.status !== "pending")
    .reduce(
      (total, order) =>
        total + order.items
          .filter((item) => item.productId === productId)
          .reduce((quantity, item) => quantity + item.quantity, 0),
      0,
    );
}

export function updateProductInventory(productId: string, quantity: number): boolean {
  const product = getAllProducts().find((candidate) => candidate.id === productId);
  if (!product) return false;
  const nextQuantity = Math.max(0, Math.floor(quantity));
  const sellerProduct = getSellerProductById(productId);
  if (sellerProduct) {
    saveSellerProduct({ ...sellerProduct, inventory: nextQuantity });
  } else {
    const overrides = getOverrides();
    overrides[productId] = nextQuantity;
    saveOverrides(overrides);
  }

  return true;
}

function updateSizeInventory(productId: string, size: ProductSize, quantity: number): boolean {
  const product = getAllProducts().find((candidate) => candidate.id === productId);
  const sellerProduct = getSellerProductById(productId);
  if (!product || !sellerProduct) return false;
  const inventoryBySize = { ...(sellerProduct.inventoryBySize || {}), [size]: Math.max(0, Math.floor(quantity)) };
  const inventory = Object.values(inventoryBySize).reduce((total, value) => total + (value || 0), 0);
  return saveSellerProduct({ ...sellerProduct, inventoryBySize, inventory });
}

export function reduceInventoryForOrder(order: Order): boolean {
  if (order.status === "pending" || order.status === "cancelled" || order.inventoryAdjusted) return false;
  const products = getAllProducts();
  const quantities = new Map<string, number>();
  const sizedQuantities = new Map<string, { productId: string; size: ProductSize; quantity: number }>();
  for (const item of order.items) {
    if (item.size) {
      const key = `${item.productId}:${item.size}`;
      sizedQuantities.set(key, { productId: item.productId, size: item.size, quantity: (sizedQuantities.get(key)?.quantity || 0) + item.quantity });
    } else {
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    }
  }
  for (const [productId, quantity] of quantities) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product || getAvailableInventory(product) < quantity) return false;
  }
  for (const { productId, size, quantity } of sizedQuantities.values()) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product || getAvailableInventoryForSize(product, size) < quantity) return false;
  }
  for (const [productId, quantity] of quantities) {
    const product = products.find((candidate) => candidate.id === productId);
    if (product) updateProductInventory(productId, getAvailableInventory(product) - quantity);
  }
  for (const { productId, size, quantity } of sizedQuantities.values()) {
    const product = products.find((candidate) => candidate.id === productId);
    if (product) updateSizeInventory(productId, size, getAvailableInventoryForSize(product, size) - quantity);
  }
  return true;
}

export function restoreInventoryForOrder(order: Order): boolean {
  if (!order.inventoryAdjusted || order.inventoryRestored) return false;
  const products = getAllProducts();
  for (const item of order.items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) continue;
    if (item.size) {
      updateSizeInventory(item.productId, item.size, getAvailableInventoryForSize(product, item.size) + item.quantity);
    } else {
      updateProductInventory(item.productId, getAvailableInventory(product) + item.quantity);
    }
  }
  return true;
}
