"use client";

import { useEffect, useState } from "react";
import { getOrderById } from "@/lib/order-storage";
import { addSupportReply, getSellerSupportTickets, SUPPORT_TICKETS_UPDATED_EVENT } from "@/lib/support-storage";
import { getSupportStatusLabel, type SupportTicket } from "@/types/support";

export function SellerSupportSection({ sellerId, userId, userName }: { sellerId: string; userId: string; userName: string }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  useEffect(() => {
    const load = () => setTickets(getSellerSupportTickets(sellerId));
    load();
    window.addEventListener(SUPPORT_TICKETS_UPDATED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(SUPPORT_TICKETS_UPDATED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [sellerId]);
  const sendReply = (ticketId: string) => {
    if (addSupportReply(ticketId, { id: userId, name: userName, role: "seller", sellerId }, replies[ticketId] || "")) {
      setReplies((current) => ({ ...current, [ticketId]: "" }));
      setTickets(getSellerSupportTickets(sellerId));
    }
  };
  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Support ({tickets.length})</h2>
      <p className="mt-1 text-sm text-muted">Only tickets linked to orders containing your products are shown.</p>
      <div className="mt-4 space-y-4">{tickets.length === 0 ? <p className="text-sm text-muted">No relevant support tickets.</p> : tickets.map((ticket) => <article key={ticket.id} className="rounded-xl border border-border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs text-muted">{ticket.id}{ticket.orderId ? ` · ${ticket.orderId}` : ""}</p><h3 className="font-semibold">{ticket.subject}</h3></div><span className="rounded-full bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">{getSupportStatusLabel(ticket.status)}</span></div><p className="mt-2 text-sm">{ticket.description}</p><p className="mt-2 text-xs text-muted">Customer: {ticket.customerName} · {getOrderById(ticket.orderId || "") ? "Linked order" : "General request"}</p><div className="mt-3 space-y-2">{ticket.replies.map((item) => <p key={item.id} className="rounded-lg bg-background p-2 text-sm"><b>{item.authorName}:</b> {item.message}</p>)}</div>{ticket.status !== "closed" ? <div className="mt-3 flex gap-2"><input value={replies[ticket.id] || ""} onChange={(e) => setReplies((current) => ({ ...current, [ticket.id]: e.target.value }))} className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" placeholder="Reply to customer" /><button type="button" onClick={() => sendReply(ticket.id)} className="rounded-full border border-brand px-3 py-2 text-xs font-semibold text-brand">Reply</button></div> : null}</article>)}</div>
    </section>
  );
}
