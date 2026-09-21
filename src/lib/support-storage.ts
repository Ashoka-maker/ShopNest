import { getAllProducts } from "@/features/products/data";
import { getOrderById } from "@/lib/order-storage";
import type { SupportCategory, SupportReply, SupportStatus, SupportTicket } from "@/types/support";

const SUPPORT_KEY = "shopnest_support_tickets";
export const SUPPORT_TICKETS_UPDATED_EVENT = "shopnest:support-tickets-updated";

function getStored(): SupportTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SUPPORT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(tickets: SupportTicket[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SUPPORT_KEY, JSON.stringify(tickets));
  window.dispatchEvent(new CustomEvent(SUPPORT_TICKETS_UPDATED_EVENT));
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortTickets(tickets: SupportTicket[]) {
  return tickets.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function getAllSupportTickets() {
  return sortTickets(getStored());
}

export function getCustomerSupportTickets(customerId: string) {
  return getAllSupportTickets().filter((ticket) => ticket.customerId === customerId);
}

function sellerOwnsTicket(ticket: SupportTicket, sellerId: string) {
  if (!ticket.orderId) return false;
  const order = getOrderById(ticket.orderId);
  if (!order) return false;
  const sellerProducts = new Set(getAllProducts().filter((product) => product.sellerId === sellerId).map((product) => product.id));
  return order.items.some((item) => sellerProducts.has(item.productId));
}

export function getSellerSupportTickets(sellerId: string) {
  return getAllSupportTickets().filter((ticket) => sellerOwnsTicket(ticket, sellerId));
}

export function createSupportTicket(input: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  category: SupportCategory;
  orderId?: string;
  subject: string;
  description: string;
}): { success: boolean; error?: string; ticket?: SupportTicket } {
  if (input.orderId) {
    const order = getOrderById(input.orderId);
    if (!order || order.customerId !== input.customerId) return { success: false, error: "You can only link your own orders." };
  }
  if (!input.subject.trim() || !input.description.trim()) return { success: false, error: "Subject and description are required." };
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: id("ticket"),
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    category: input.category,
    ...(input.orderId ? { orderId: input.orderId } : {}),
    subject: input.subject.trim(),
    description: input.description.trim(),
    status: "open",
    replies: [],
    internalNotes: [],
    createdAt: now,
    updatedAt: now,
  };
  save([...getStored(), ticket]);
  return { success: true, ticket };
}

export function addSupportReply(
  ticketId: string,
  author: { id: string; name: string; role: "customer" | "seller" | "admin"; sellerId?: string },
  message: string,
): { success: boolean; error?: string } {
  const tickets = getStored();
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);
  if (index < 0 || !message.trim()) return { success: false, error: "Ticket or reply is invalid." };
  const ticket = tickets[index];
  if (author.role === "customer" && ticket.customerId !== author.id) return { success: false, error: "You can only reply to your own tickets." };
  if (author.role === "seller" && (!author.sellerId || !sellerOwnsTicket(ticket, author.sellerId))) return { success: false, error: "You are not authorized to access this ticket." };
  const reply: SupportReply = { id: id("reply"), authorId: author.id, authorName: author.name, authorRole: author.role, message: message.trim(), createdAt: new Date().toISOString() };
  tickets[index] = { ...ticket, replies: [...ticket.replies, reply], updatedAt: reply.createdAt };
  save(tickets);
  return { success: true };
}

export function updateSupportTicketStatus(ticketId: string, isAdmin: boolean, status: SupportStatus) {
  if (!isAdmin) return false;
  const tickets = getStored();
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);
  if (index < 0) return false;
  tickets[index] = { ...tickets[index], status, updatedAt: new Date().toISOString() };
  save(tickets);
  return true;
}

export function addSupportInternalNote(ticketId: string, isAdmin: boolean, authorId: string, message: string) {
  if (!isAdmin || !message.trim()) return false;
  const tickets = getStored();
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);
  if (index < 0) return false;
  const note = { id: id("note"), authorId, message: message.trim(), createdAt: new Date().toISOString() };
  tickets[index] = { ...tickets[index], internalNotes: [...tickets[index].internalNotes, note], updatedAt: note.createdAt };
  save(tickets);
  return true;
}
