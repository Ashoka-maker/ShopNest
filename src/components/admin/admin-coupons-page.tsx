"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { COUPONS_UPDATED_EVENT, deleteCoupon, getAllCoupons, saveCoupon, setCouponActive } from "@/lib/coupon-storage";
import type { Coupon, CouponDiscountType, CouponInput } from "@/types/coupon";

const emptyCoupon: CouponInput = {
  code: "", discountType: "percentage", value: 10, minOrderCents: 0,
  maxDiscountCents: null, startsAt: null, expiresAt: null, usageLimit: null, active: true,
};

export function AdminCouponsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponInput>(emptyCoupon);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !isAdmin) { router.push("/admin/login"); return; }
    const load = () => setCoupons(getAllCoupons());
    load();
    window.addEventListener(COUPONS_UPDATED_EVENT, load);
    return () => window.removeEventListener(COUPONS_UPDATED_EVENT, load);
  }, [isAdmin, router, user]);

  if (!user || !isAdmin) return null;

  const update = (key: keyof CouponInput, value: string | number | boolean | null) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.code.trim()) { setError("Coupon code is required."); return; }
    if (form.value <= 0 || form.minOrderCents < 0) { setError("Enter valid discount and minimum values."); return; }
    saveCoupon(form, editingId);
    setForm(emptyCoupon);
    setEditingId(undefined);
  };
  const edit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({ code: coupon.code, discountType: coupon.discountType, value: coupon.value, minOrderCents: coupon.minOrderCents, maxDiscountCents: coupon.maxDiscountCents, startsAt: coupon.startsAt, expiresAt: coupon.expiresAt, usageLimit: coupon.usageLimit, active: coupon.active });
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Coupon Management</h1>
        <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">Code<input value={form.code} onChange={(e) => update("code", e.target.value)} className="h-10 rounded-lg border border-border px-3" placeholder="SAVE10" /></label>
          <label className="grid gap-2 text-sm font-medium">Type<select value={form.discountType} onChange={(e) => update("discountType", e.target.value as CouponDiscountType)} className="h-10 rounded-lg border border-border px-3"><option value="percentage">Percentage</option><option value="fixed">Fixed ₹</option></select></label>
          <label className="grid gap-2 text-sm font-medium">{form.discountType === "percentage" ? "Discount %" : "Discount ₹"}<input type="number" min="1" value={form.discountType === "fixed" ? form.value / 100 : form.value} onChange={(e) => update("value", form.discountType === "fixed" ? Math.round(Number(e.target.value) * 100) : Number(e.target.value))} className="h-10 rounded-lg border border-border px-3" /></label>
          <label className="grid gap-2 text-sm font-medium">Minimum order ₹<input type="number" min="0" value={form.minOrderCents / 100} onChange={(e) => update("minOrderCents", Math.round(Number(e.target.value) * 100))} className="h-10 rounded-lg border border-border px-3" /></label>
          <label className="grid gap-2 text-sm font-medium">Maximum discount ₹<input type="number" min="0" value={form.maxDiscountCents === null ? "" : form.maxDiscountCents / 100} onChange={(e) => update("maxDiscountCents", e.target.value ? Math.round(Number(e.target.value) * 100) : null)} className="h-10 rounded-lg border border-border px-3" placeholder="No cap" /></label>
          <label className="grid gap-2 text-sm font-medium">Starts<input type="datetime-local" value={form.startsAt ? form.startsAt.slice(0, 16) : ""} onChange={(e) => update("startsAt", e.target.value ? new Date(e.target.value).toISOString() : null)} className="h-10 rounded-lg border border-border px-3" /></label>
          <label className="grid gap-2 text-sm font-medium">Expires<input type="datetime-local" value={form.expiresAt ? form.expiresAt.slice(0, 16) : ""} onChange={(e) => update("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)} className="h-10 rounded-lg border border-border px-3" /></label>
          <label className="grid gap-2 text-sm font-medium">Usage limit<input type="number" min="1" value={form.usageLimit ?? ""} onChange={(e) => update("usageLimit", e.target.value ? Number(e.target.value) : null)} className="h-10 rounded-lg border border-border px-3" placeholder="Unlimited" /></label>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} /> Active</label>
          <div className="flex items-center gap-2"><button type="submit" className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">{editingId ? "Update coupon" : "Create coupon"}</button>{editingId ? <button type="button" onClick={() => { setEditingId(undefined); setForm(emptyCoupon); }} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">Cancel</button> : null}</div>
          {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
        </form>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase text-muted"><tr><th className="p-4">Code</th><th className="p-4">Discount</th><th className="p-4">Validity</th><th className="p-4">Usage</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y divide-border">
            {coupons.map((coupon) => <tr key={coupon.id}><td className="p-4 font-semibold">{coupon.code}<span className={`ml-2 rounded-full px-2 py-1 text-xs ${coupon.active ? "bg-green-100 text-green-800" : "bg-border text-muted"}`}>{coupon.active ? "Active" : "Inactive"}</span></td><td className="p-4">{coupon.discountType === "percentage" ? `${coupon.value}%` : `₹${(coupon.value / 100).toLocaleString("en-IN")}`}</td><td className="p-4">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "No expiry"}</td><td className="p-4">{coupon.usageCount}{coupon.usageLimit === null ? "" : ` / ${coupon.usageLimit}`}</td><td className="flex gap-3 p-4"><button onClick={() => edit(coupon)} className="font-semibold text-brand">Edit</button><button onClick={() => setCouponActive(coupon.id, !coupon.active)} className="font-semibold text-brand">{coupon.active ? "Deactivate" : "Activate"}</button><button onClick={() => { if (confirm(`Delete coupon ${coupon.code}?`)) deleteCoupon(coupon.id); }} className="font-semibold text-red-600">Delete</button></td></tr>)}
          </tbody></table>
        </div>
      </div>
    </Container>
  );
}
