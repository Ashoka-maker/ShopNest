"use client";

import { useEffect, useState } from "react";
import { getOrderById } from "@/lib/order-storage";
import { addSupportInternalNote, addSupportReply, getAllSupportTickets, SUPPORT_TICKETS_UPDATED_EVENT, updateSupportTicketStatus } from "@/lib/support-storage";
import { getSupportStatusLabel, SUPPORT_STATUSES, type SupportStatus, type SupportTicket } from "@/types/support";

export function AdminSupportSection({ userId, userName, isAdmin }: { userId: string; userName: string; isAdmin: boolean }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [status, setStatus] = useState<SupportStatus | "all">("all");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    const load = () => setTickets(getAllSupportTickets());
    load();
    window.addEventListener(SUPPORT_TICKETS_UPDATED_EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(SUPPORT_TICKETS_UPDATED_EVENT, load); window.removeEventListener("storage", load); };
  }, []);
  const update = (ticketId: string, nextStatus: SupportStatus) => { if (updateSupportTicketStatus(ticketId, isAdmin, nextStatus)) setTickets(getAllSupportTickets()); };
  const reply = (ticket: SupportTicket) => { if (addSupportReply(ticket.id, { id: userId, name: userName, role: "admin" }, replies[ticket.id] || "")) { setReplies((current) => ({ ...current, [ticket.id]: "" })); setTickets(getAllSupportTickets()); } };
  const addNote = (ticket: SupportTicket) => { if (addSupportInternalNote(ticket.id, isAdmin, userId, notes[ticket.id] || "")) { setNotes((current) => ({ ...current, [ticket.id]: "" })); setTickets(getAllSupportTickets()); } };
  const visible = status === "all" ? tickets : tickets.filter((ticket) => ticket.status === status);
  return (
    <section className="mb-8 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-lg font-semibold tracking-tight">Support & Disputes ({visible.length})</h2><p className="mt-1 text-sm text-muted">Admin replies are public. Internal notes remain visible only here.</p></div><select value={status} onChange={(e) => setStatus(e.target.value as SupportStatus | "all")} className="rounded-lg border border-border bg-white px-3 py-2 text-sm"><option value="all">All statuses</option>{SUPPORT_STATUSES.map((item) => <option key={item} value={item}>{getSupportStatusLabel(item)}</option>)}</select></div>
      <div className="mt-4 space-y-4">{visible.length === 0 ? <p className="text-sm text-muted">No support tickets.</p> : visible.map((ticket) => { const order = getOrderById(ticket.orderId || ""); return <article key={ticket.id} className="rounded-xl border border-border bg-white p-4"><div className="grid gap-3 text-sm md:grid-cols-3"><div><p className="text-muted">Ticket</p><p className="font-semibold">{ticket.id}</p></div><div><p className="text-muted">Customer</p><p>{ticket.customerName}</p><p className="text-xs text-muted">{ticket.customerEmail}</p></div><div><p className="text-muted">Category / order</p><p>{ticket.category}{order ? ` · ${order.id}` : ""}</p></div></div><h3 className="mt-3 font-semibold">{ticket.subject}</h3><p className="mt-1 text-sm">{ticket.description}</p><div className="mt-3 space-y-2">{ticket.replies.map((item) => <p key={item.id} className="rounded-lg bg-background p-2 text-sm"><b>{item.authorName} ({item.authorRole}):</b> {item.message}</p>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><select value={ticket.status} onChange={(e) => update(ticket.id, e.target.value as SupportStatus)} className="rounded-lg border border-border px-3 py-2 text-sm">{SUPPORT_STATUSES.map((item) => <option key={item} value={item}>{getSupportStatusLabel(item)}</option>)}</select><div className="flex gap-2"><input value={replies[ticket.id] || ""} onChange={(e) => setReplies((current) => ({ ...current, [ticket.id]: e.target.value }))} placeholder="Public reply" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" /><button type="button" onClick={() => reply(ticket)} className="rounded-full border border-brand px-3 py-2 text-xs font-semibold text-brand">Reply</button></div></div><div className="mt-3 flex gap-2"><input value={notes[ticket.id] || ""} onChange={(e) => setNotes((current) => ({ ...current, [ticket.id]: e.target.value }))} placeholder="Internal admin note" className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm" /><button type="button" onClick={() => addNote(ticket)} className="rounded-full bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">Add note</button></div>{ticket.internalNotes.length ? <p className="mt-2 text-xs text-amber-800">Internal notes: {ticket.internalNotes.map((note) => note.message).join(" · ")}</p> : null}</article>; })}</div>
    </section>
  );
}
