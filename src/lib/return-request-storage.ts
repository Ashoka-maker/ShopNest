import { getAllProducts } from "@/features/products/data";
import { createOrderNotification } from "@/lib/notification-storage";
import { getOrderById } from "@/lib/order-storage";
import type { ProductSize } from "@/types/product";
import type {
  RefundStatus,
  ReturnReason,
  ReturnRequest,
  ReturnRequestStatus,
} from "@/types/return-request";

const RETURN_REQUESTS_STORAGE_KEY = "shopnest_return_requests";
export const RETURN_REQUESTS_UPDATED_EVENT = "shopnest:return-requests-updated";

function getStoredRequests(): ReturnRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(RETURN_REQUESTS_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveRequests(requests: ReturnRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RETURN_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent(RETURN_REQUESTS_UPDATED_EVENT));
}

function requestMatchesItem(request: ReturnRequest, orderId: string, productId: string, size?: ProductSize) {
  return request.orderId === orderId && request.productId === productId && request.size === size;
}

function requestId() {
  return `return-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getAllReturnRequests(): ReturnRequest[] {
  return getStoredRequests().sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export function getReturnRequestsByCustomerId(customerId: string): ReturnRequest[] {
  return getAllReturnRequests().filter((request) => request.customerId === customerId);
}

export function getReturnRequestsForSeller(sellerId: string): ReturnRequest[] {
  const products = new Set(getAllProducts().filter((product) => product.sellerId === sellerId).map((product) => product.id));
  return getAllReturnRequests().filter((request) => products.has(request.productId));
}

export function hasReturnRequestForItem(orderId: string, productId: string, size?: ProductSize): boolean {
  return getStoredRequests().some((request) => requestMatchesItem(request, orderId, productId, size));
}

export function createCustomerReturnRequest(input: {
  orderId: string;
  customerId: string;
  productId: string;
  size?: ProductSize;
  quantity: number;
  reason: ReturnReason;
  description?: string;
}): { success: boolean; error?: string; request?: ReturnRequest } {
  const order = getOrderById(input.orderId);
  if (!order || order.customerId !== input.customerId) {
    return { success: false, error: "You can only request a return for your own order." };
  }
  if (order.status !== "delivered") {
    return { success: false, error: "Returns can be requested after an order is delivered." };
  }
  const item = order.items.find(
    (candidate) => candidate.productId === input.productId && candidate.size === input.size,
  );
  if (!item || input.quantity < 1 || input.quantity > item.quantity) {
    return { success: false, error: "The requested return quantity is not valid for this order item." };
  }
  if (hasReturnRequestForItem(input.orderId, input.productId, input.size)) {
    return { success: false, error: "A return request already exists for this order item." };
  }

  const now = new Date().toISOString();
  const request: ReturnRequest = {
    id: requestId(),
    orderId: input.orderId,
    customerId: input.customerId,
    productId: input.productId,
    ...(input.size ? { size: input.size } : {}),
    quantity: input.quantity,
    reason: input.reason,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    status: "requested",
    refundStatus: "not-started",
    createdAt: now,
    updatedAt: now,
    timeline: [{ status: "requested", createdAt: now }],
  };
  saveRequests([...getStoredRequests(), request]);
  createOrderNotification(input.customerId, input.orderId, "Return request submitted", "Your return request is now under review.");
  return { success: true, request };
}

export function updateSellerReturnRequest(
  requestIdValue: string,
  sellerId: string,
  status: Extract<ReturnRequestStatus, "approved" | "rejected">,
  response?: string,
): boolean {
  const requests = getStoredRequests();
  const index = requests.findIndex((request) => request.id === requestIdValue);
  if (index < 0) return false;
  const product = getAllProducts().find((candidate) => candidate.id === requests[index].productId);
  if (!product || product.sellerId !== sellerId) return false;
  if (!["requested", "under-review"].includes(requests[index].status)) return false;
  const updated = {
    ...requests[index],
    status,
    sellerResponse: response?.trim() || undefined,
    updatedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    timeline: [
      ...requests[index].timeline,
      { status, createdAt: new Date().toISOString(), ...(response?.trim() ? { note: response.trim() } : {}) },
    ],
  };
  requests[index] = updated;
  saveRequests(requests);
  createOrderNotification(
    updated.customerId,
    updated.orderId,
    "Return request updated",
    status === "approved" ? "Your seller approved the return request." : "Your seller rejected the return request.",
  );
  return true;
}

export function updateAdminReturnRequest(
  requestIdValue: string,
  isAdmin: boolean,
  updates: { status?: ReturnRequestStatus; refundStatus?: RefundStatus; response?: string },
): boolean {
  if (!isAdmin) return false;
  const requests = getStoredRequests();
  const index = requests.findIndex((request) => request.id === requestIdValue);
  if (index < 0) return false;
  const current = requests[index];
  const updated: ReturnRequest = {
    ...current,
    ...(updates.status ? { status: updates.status } : {}),
    ...(updates.refundStatus ? { refundStatus: updates.refundStatus } : {}),
    ...(updates.response?.trim() ? { adminResponse: updates.response.trim() } : {}),
    updatedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    timeline: updates.status && updates.status !== current.status
      ? [...current.timeline, { status: updates.status, createdAt: new Date().toISOString(), ...(updates.response?.trim() ? { note: updates.response.trim() } : {}) }]
      : current.timeline,
  };
  requests[index] = updated;
  saveRequests(requests);
  createOrderNotification(
    updated.customerId,
    updated.orderId,
    "Return or refund request updated",
    `Your request is ${updated.status.replaceAll("-", " ")}. Refund status: ${updated.refundStatus.replaceAll("-", " ")}.`,
  );
  return true;
}
