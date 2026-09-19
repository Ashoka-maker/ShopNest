"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getCustomerNotifications, markAllNotificationsRead, markNotificationRead, NOTIFICATIONS_UPDATED_EVENT } from "@/lib/notification-storage";
import type { Notification } from "@/types/notification";

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const load = () => setNotifications(user?.role === "customer" ? getCustomerNotifications(user.id) : []);
    load();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, load);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, load);
  }, [user]);

  if (!user || user.role !== "customer") return null;
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-lg" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={open}>
        <span aria-hidden>♢</span>
        {unreadCount ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border bg-surface p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Notifications</h2>
            {unreadCount ? <button type="button" onClick={() => markAllNotificationsRead(user.id)} className="text-xs font-semibold text-brand">Mark all as read</button> : null}
          </div>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {notifications.length === 0 ? <p className="py-5 text-center text-sm text-muted">No notifications yet.</p> : notifications.map((notification) => (
              <div key={notification.id} className={`rounded-xl p-3 text-sm ${notification.read ? "bg-background" : "bg-brand/10"}`}>
                <button type="button" className="w-full text-left" onClick={() => markNotificationRead(user.id, notification.id)}>
                  <p className="font-semibold">{notification.title}</p>
                  <p className="mt-1 text-muted">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(notification.createdAt).toLocaleString()}</p>
                </button>
                <Link href={`/orders`} onClick={() => markNotificationRead(user.id, notification.id)} className="mt-2 inline-block text-xs font-semibold text-brand">View orders</Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
