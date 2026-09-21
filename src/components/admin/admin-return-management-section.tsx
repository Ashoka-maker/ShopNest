"use client";

import { useEffect, useState } from "react";
import { getAllProducts } from "@/features/products/data";
import { getOrderById } from "@/lib/order-storage";
import {
  getAllReturnRequests,
  RETURN_REQUESTS_UPDATED_EVENT,
  updateAdminReturnRequest,
} from "@/lib/return-request-storage";
import {
  getRefundStatusLabel,
  getReturnRequestStatusLabel,
  RETURN_REQUEST_STATUSES,
  type RefundStatus,
  type ReturnRequest,
  type ReturnRequestStatus,
} from "@/types/return-request";

export function AdminReturnManagementSection({ isAdmin }: { isAdmin: boolean }) {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReturnRequestStatus | "all">("all");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = () => setRequests(getAllReturnRequests());
    load();
    window.addEventListener(RETURN_REQUESTS_UPDATED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(RETURN_REQUESTS_UPDATED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const updateRequest = (requestId: string, updates: { status?: ReturnRequestStatus; refundStatus?: RefundStatus }) => {
    if (!updateAdminReturnRequest(requestId, isAdmin, { ...updates, response: responses[requestId] })) {
      setMessage("The return request could not be updated.");
      return;
    }
    setMessage("Return request updated.");
    setRequests(getAllReturnRequests());
  };

  const visibleRequests = statusFilter === "all" ? requests : requests.filter((request) => request.status === statusFilter);

  return (
    <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Return Management ({visibleRequests.length})</h2>
          <p className="mt-1 text-sm text-muted">Review all customer return requests and track manual refund processing separately.</p>
        </div>
        <label className="text-sm font-medium">
          Filter
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReturnRequestStatus | "all")} className="ml-2 rounded-lg border border-border bg-white px-3 py-2 font-normal">
            <option value="all">All statuses</option>
            {RETURN_REQUEST_STATUSES.map((status) => <option key={status} value={status}>{getReturnRequestStatusLabel(status)}</option>)}
          </select>
        </label>
      </div>
      {visibleRequests.length === 0 ? <p className="mt-4 text-sm text-muted">No return requests found.</p> : (
        <div className="mt-4 space-y-4">
          {visibleRequests.map((request) => {
            const product = getAllProducts().find((candidate) => candidate.id === request.productId);
            const order = getOrderById(request.orderId);
            return (
              <article key={request.id} className="rounded-xl border border-border bg-white p-4">
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div><p className="text-muted">Order</p><p className="font-semibold">{request.orderId}</p></div>
                  <div><p className="text-muted">Customer</p><p>{order?.shippingAddress.fullName || request.customerId}</p><p className="text-xs text-muted">{order?.customerEmail}</p></div>
                  <div><p className="text-muted">Seller</p><p>{product?.sellerName || "Unknown seller"}</p></div>
                  <div><p className="text-muted">Product</p><p>{product?.name || request.productId}{request.size ? ` (${request.size})` : ""}</p></div>
                  <div><p className="text-muted">Reason / quantity</p><p>{request.reason} · {request.quantity}</p></div>
                  <div><p className="text-muted">Requested</p><p>{new Date(request.createdAt).toLocaleDateString()}</p></div>
                </div>
                {request.description ? <p className="mt-3 rounded-lg bg-background p-3 text-sm"><span className="font-semibold">Description:</span> {request.description}</p> : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">Return status
                    <select value={request.status} onChange={(event) => updateRequest(request.id, { status: event.target.value as ReturnRequestStatus })} className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal">
                      {RETURN_REQUEST_STATUSES.map((status) => <option key={status} value={status}>{getReturnRequestStatusLabel(status)}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium">Refund status
                    <select value={request.refundStatus} onChange={(event) => updateRequest(request.id, { refundStatus: event.target.value as RefundStatus })} className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal">
                      <option value="not-started">Not started</option>
                      <option value="processing">Refund processing</option>
                      <option value="refunded">Refunded (manual)</option>
                    </select>
                  </label>
                </div>
                <textarea value={responses[request.id] ?? request.adminResponse ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [request.id]: event.target.value }))} rows={2} placeholder="Optional admin response to customer" className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm" />
                <p className="mt-2 text-xs text-muted">Refunded means manually marked by admin. No payment API is connected.</p>
                {request.sellerResponse ? <p className="mt-2 text-sm text-muted">Seller response: {request.sellerResponse}</p> : null}
                <p className="mt-1 text-sm font-medium">Current refund state: {getRefundStatusLabel(request.refundStatus)}</p>
              </article>
            );
          })}
        </div>
      )}
      {message ? <p className="mt-4 text-sm font-medium text-brand">{message}</p> : null}
    </section>
  );
}
