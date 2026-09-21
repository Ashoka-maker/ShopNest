"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getOrdersByCustomerId } from "@/lib/order-storage";
import {
  addSupportReply,
  createSupportTicket,
  getCustomerSupportTickets,
  SUPPORT_TICKETS_UPDATED_EVENT,
} from "@/lib/support-storage";
import { getSupportStatusLabel, SUPPORT_CATEGORIES, type SupportCategory, type SupportTicket } from "@/types/support";

export function SupportCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [category, setCategory] = useState<SupportCategory>("Order");
  const [orderId, setOrderId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || user.role !== "customer") {
      router.push("/signin");
      return;
    }
    const load = () => setTickets(getCustomerSupportTickets(user.id));
    load();
    window.addEventListener(SUPPORT_TICKETS_UPDATED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(SUPPORT_TICKETS_UPDATED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [router, user]);

  if (!user || user.role !== "customer") return null;
  const orders = getOrdersByCustomerId(user.id);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = createSupportTicket({ customerId: user.id, customerName: user.name, customerEmail: user.email, category, orderId: orderId || undefined, subject, description });
    setMessage(result.success ? "Support ticket created." : result.error || "Unable to create ticket.");
    if (result.success) {
      setSubject("");
      setDescription("");
      setOrderId("");
      setTickets(getCustomerSupportTickets(user.id));
    }
  };

  const sendReply = (ticketId: string) => {
    const result = addSupportReply(ticketId, { id: user.id, name: user.name, role: "customer" }, reply[ticketId] || "");
    setMessage(result.success ? "Reply sent." : result.error || "Unable to send reply.");
    if (result.success) {
      setReply((current) => ({ ...current, [ticketId]: "" }));
      setTickets(getCustomerSupportTickets(user.id));
    }
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Help & Support</h1>
        <p className="mt-2 text-sm text-muted">Create a ticket and keep all support conversations in one place.</p>
        <form onSubmit={submit} className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Create a support ticket</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Category<select value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)} className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal">{SUPPORT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-sm font-medium">Link an order (optional)<select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal"><option value="">No order selected</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.id}</option>)}</select></label>
          </div>
          <label className="mt-4 block text-sm font-medium">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} required className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal" /></label>
          <label className="mt-4 block text-sm font-medium">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal" /></label>
          <button type="submit" className="mt-4 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Create ticket</button>
        </form>
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Previous tickets ({tickets.length})</h2>
          <div className="mt-4 space-y-4">{tickets.length === 0 ? <p className="text-sm text-muted">You have no support tickets.</p> : tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-muted">{ticket.id} · {ticket.category}{ticket.orderId ? ` · ${ticket.orderId}` : ""}</p><h3 className="mt-1 font-semibold">{ticket.subject}</h3></div><span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{getSupportStatusLabel(ticket.status)}</span></div>
              <p className="mt-3 text-sm">{ticket.description}</p>
              <div className="mt-4 space-y-2 border-t border-border pt-4">{ticket.replies.map((item) => <p key={item.id} className="rounded-lg bg-background p-3 text-sm"><span className="font-semibold">{item.authorName} ({item.authorRole}):</span> {item.message}</p>)}</div>
              {ticket.status !== "closed" ? <div className="mt-4 flex gap-2"><input value={reply[ticket.id] || ""} onChange={(e) => setReply((current) => ({ ...current, [ticket.id]: e.target.value }))} placeholder="Write a reply" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" /><button type="button" onClick={() => sendReply(ticket.id)} className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand">Reply</button></div> : <p className="mt-4 text-xs text-muted">This ticket is closed.</p>}
            </article>
          ))}</div>
        </section>
        {message ? <p className="mt-4 text-sm font-medium text-brand">{message}</p> : null}
      </div>
    </Container>
  );
}
