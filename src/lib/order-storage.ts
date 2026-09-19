import type { Order } from "@/types/order";
import { createOrderNotification } from "@/lib/notification-storage";
import { restoreInventoryForOrder } from "@/lib/inventory-storage";

const ORDERS_STORAGE_KEY = "shopnest_orders";
export const ORDERS_UPDATED_EVENT = "shopnest:orders-updated";

// Helper functions for localStorage
const getStoredOrders = (): Order[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveStoredOrders = (orders: Order[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent(ORDERS_UPDATED_EVENT));
  } catch (e) {
    console.error("Failed to save orders:", e);
  }
};

export function saveOrder(order: Order): void {
  const orders = getStoredOrders();
  orders.push(order);
  saveStoredOrders(orders);
}

export function updateOrderPayment(
  orderId: string,
  payment: Pick<Order, "paymentStatus" | "status" | "razorpayPaymentId">,
): boolean {
  const orders = getStoredOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index < 0) return false;
  const previous = orders[index];
  orders[index] = { ...previous, ...payment };
  saveStoredOrders(orders);
  if (payment.paymentStatus && payment.paymentStatus !== previous.paymentStatus) {
    createOrderNotification(previous.customerId, previous.id, "Payment status updated", `Your UPI payment is now ${payment.paymentStatus}.`);
  }
  return true;
}

export function markOrderInventoryAdjusted(orderId: string): boolean {
  const orders = getStoredOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index < 0) return false;
  orders[index] = { ...orders[index], inventoryAdjusted: true };
  saveStoredOrders(orders);
  return true;
}

export function getOrdersByCustomerId(customerId: string): Order[] {
  const orders = getStoredOrders();
  return orders.filter((order) => order.customerId === customerId);
}

export function getAllOrders(): Order[] {
  return getStoredOrders();
}

export function updateOrderStatus(orderId: string, status: Order["status"]): boolean {
  const orders = getStoredOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index < 0) return false;
  const previous = orders[index];
  orders[index] = { ...previous, status };
  saveStoredOrders(orders);
  if (previous.status !== status) {
    createOrderNotification(previous.customerId, previous.id, "Order status updated", `Your order is now ${status === "out-for-delivery" ? "Out for Delivery" : status.charAt(0).toUpperCase() + status.slice(1)}.`);
  }
  return true;
}

export function cancelCustomerOrder(orderId: string, customerId: string): boolean {
  const orders = getStoredOrders();
  const index = orders.findIndex(
    (order) => order.id === orderId && order.customerId === customerId &&
      (order.status === "pending" || order.status === "confirmed"),
  );
  if (index < 0) return false;
  const order = orders[index];
  const restored = restoreInventoryForOrder(order);
  orders[index] = { ...order, status: "cancelled", ...(restored ? { inventoryRestored: true } : {}) };
  saveStoredOrders(orders);
  createOrderNotification(customerId, orderId, "Order cancelled", "Your order cancellation was successful.");
  return true;
}

export function getOrderById(orderId: string): Order | null {
  const orders = getStoredOrders();
  return orders.find((order) => order.id === orderId) ?? null;
}

export function generateOrderId(): string {
  return "order-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
}

export function calculateDeliveryCharge(subtotalCents: number): number {
  // Free delivery for orders over ₹50, otherwise ₹5.99
  const FREE_DELIVERY_THRESHOLD = 5000; // ₹50.00
  const DELIVERY_CHARGE = 599; // ₹5.99
  
  return subtotalCents >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
}
