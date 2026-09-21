export const RETURN_REQUEST_STATUSES = [
  "requested",
  "under-review",
  "approved",
  "rejected",
  "return-pending",
  "returned",
  "refund-processing",
  "refunded",
  "cancelled",
] as const;

export type ReturnRequestStatus = (typeof RETURN_REQUEST_STATUSES)[number];

export const RETURN_REASONS = [
  "Wrong Product",
  "Damaged Product",
  "Not as Described",
  "Wrong Size",
  "Missing Item",
  "Other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];
export type RefundStatus = "not-started" | "processing" | "refunded";

export type ReturnTimelineEntry = {
  status: ReturnRequestStatus;
  createdAt: string;
  note?: string;
};

export type ReturnRequest = {
  id: string;
  orderId: string;
  customerId: string;
  productId: string;
  size?: string;
  quantity: number;
  reason: ReturnReason;
  description?: string;
  status: ReturnRequestStatus;
  refundStatus: RefundStatus;
  customerMessage?: string;
  sellerResponse?: string;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  timeline: ReturnTimelineEntry[];
};

export function getReturnRequestStatusLabel(status: ReturnRequestStatus): string {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRefundStatusLabel(status: RefundStatus): string {
  if (status === "not-started") return "Not started";
  if (status === "processing") return "Refund processing";
  return "Refunded (manual)";
}
