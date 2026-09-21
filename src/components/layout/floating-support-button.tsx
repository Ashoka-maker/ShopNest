"use client";

import { useState } from "react";
import Link from "next/link";

export function FloatingSupportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open ? (
        <div className="shopnest-shadow fixed right-4 bottom-20 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-border bg-surface p-5 sm:right-6 sm:bottom-24">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Support</p><h2 className="mt-1 text-lg font-semibold">How can we help?</h2></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support menu" className="text-muted hover:text-foreground">×</button>
          </div>
          <div className="mt-4 grid gap-2">
            <a href="https://wa.me/919663427720" target="_blank" rel="noreferrer" className="rounded-2xl border border-border px-4 py-3 hover:border-brand hover:bg-ink-soft"><p className="font-semibold text-brand">WhatsApp Support</p><p className="mt-1 text-xs text-muted">+91 96634 27720</p></a>
            <a href="mailto:ashoka6031@gmail.com" className="rounded-2xl border border-border px-4 py-3 hover:border-brand hover:bg-ink-soft"><p className="font-semibold text-brand">Email Support</p><p className="mt-1 text-xs text-muted">ashoka6031@gmail.com</p></a>
          </div>
          <Link href="/support" className="mt-4 block text-center text-xs font-semibold text-muted hover:text-brand">Open support tickets</Link>
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="shopnest-focus fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-brand/20 hover:-translate-y-0.5 hover:bg-brand-dark sm:right-6 sm:bottom-6">
        <span aria-hidden className="text-base">◌</span> Help & Support
      </button>
    </>
  );
}
