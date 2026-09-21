export const SUPPORT_CATEGORIES = ["Order", "Payment", "Return", "Refund", "Product", "Seller", "Other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = ["open", "in-progress", "waiting-for-customer", "resolved", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
export type SupportAuthorRole = "customer" | "seller" | "admin";

export type SupportReply = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: SupportAuthorRole;
  message: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  category: SupportCategory;
  orderId?: string;
  subject: string;
  description: string;
  status: SupportStatus;
  replies: SupportReply[];
  internalNotes: { id: string; authorId: string; message: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
};

export function getSupportStatusLabel(status: SupportStatus) {
  return status === "in-progress"
    ? "In Progress"
    : status === "waiting-for-customer"
      ? "Waiting for Customer"
      : status.charAt(0).toUpperCase() + status.slice(1);
}
