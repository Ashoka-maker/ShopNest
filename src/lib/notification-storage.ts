import type { Notification } from "@/types/notification";

const NOTIFICATIONS_PREFIX = "shopnest_notifications_";
export const NOTIFICATIONS_UPDATED_EVENT = "shopnest:notifications-updated";

function keyForCustomer(customerId: string) {
  return `${NOTIFICATIONS_PREFIX}${customerId}`;
}

function getStored(customerId: string): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(keyForCustomer(customerId)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function save(customerId: string, notifications: Notification[]) {
  localStorage.setItem(keyForCustomer(customerId), JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}

export function getCustomerNotifications(customerId: string) {
  return getStored(customerId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function createOrderNotification(
  customerId: string,
  orderId: string,
  title: string,
  message: string,
) {
  if (typeof window === "undefined" || !customerId) return;
  const notification: Notification = {
    id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customerId,
    orderId,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  };
  save(customerId, [...getStored(customerId), notification]);
}

export function markNotificationRead(customerId: string, notificationId: string) {
  save(customerId, getStored(customerId).map((item) => item.id === notificationId ? { ...item, read: true } : item));
}

export function markAllNotificationsRead(customerId: string) {
  save(customerId, getStored(customerId).map((item) => ({ ...item, read: true })));
}
