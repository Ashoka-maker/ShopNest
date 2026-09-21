"use client";

import { useEffect, useState } from "react";
import { getAllProducts } from "@/features/products/data";
import {
  getReturnRequestsForSeller,
  RETURN_REQUESTS_UPDATED_EVENT,
  updateSellerReturnRequest,
} from "@/lib/return-request-storage";
import { getOrderById } from "@/lib/order-storage";
import { getReturnRequestStatusLabel, type ReturnRequest } from "@/types/return-request";

export function SellerReturnRequestsSection({ sellerId }: { sellerId: string }) {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = () => setRequests(getReturnRequestsForSeller(sellerId));
    load();
    window.addEventListener(RETURN_REQUESTS_UPDATED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(RETURN_REQUESTS_UPDATED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [sellerId]);

  const updateRequest = (request: ReturnRequest, status: "approved" | "rejected") => {
    if (!updateSellerReturnRequest(request.id, sellerId, status, responses[request.id])) {
      setMessage("This return request could not be updated.");
      return;
    }
    setMessage("Return request updated.");
    setRequests(getReturnRequestsForSeller(sellerId));
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Return Requests ({requests.length})</h2>
      <p className="mt-1 text-sm text-muted">Review requests for your products. Final refund processing is controlled separately by admin.</p>
      {requests.length === 0 ? <p className="mt-4 text-sm text-muted">No return requests for your products.</p> : (
        <div className="mt-4 space-y-4">
          {requests.map((request) => {
            const product = getAllProducts().find((candidate) => candidate.id === request.productId);
            const order = getOrderById(request.orderId);
            const canReview = request.status === "requested" || request.status === "under-review";
            return (
              <article key={request.id} className="rounded-xl border border-border bg-white p-4">
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div><p className="text-muted">Order</p><p className="font-semibold">{request.orderId}</p></div>
                  <div><p className="text-muted">Customer</p><p>{order?.shippingAddress.fullName || request.customerId}</p></div>
                  <div><p className="text-muted">Status</p><p className="font-semibold">{getReturnRequestStatusLabel(request.status)}</p></div>
                  <div><p className="text-muted">Product</p><p>{product?.name || request.productId}{request.size ? ` (${request.size})` : ""}</p></div>
                  <div><p className="text-muted">Quantity</p><p>{request.quantity}</p></div>
                  <div><p className="text-muted">Reason</p><p>{request.reason}</p></div>
                </div>
                {request.description ? <p className="mt-3 rounded-lg bg-background p-3 text-sm"><span className="font-semibold">Customer description:</span> {request.description}</p> : null}
                {canReview ? (
                  <div className="mt-4">
                    <textarea value={responses[request.id] || ""} onChange={(event) => setResponses((current) => ({ ...current, [request.id]: event.target.value }))} rows={2} placeholder="Optional response to customer" className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateRequest(request, "approved")} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                      <button type="button" onClick={() => updateRequest(request, "rejected")} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">Reject</button>
                    </div>
                  </div>
                ) : request.sellerResponse ? <p className="mt-3 text-sm text-muted">Seller response: {request.sellerResponse}</p> : null}
              </article>
            );
          })}
        </div>
      )}
      {message ? <p className="mt-4 text-sm font-medium text-brand">{message}</p> : null}
    </section>
  );
}
