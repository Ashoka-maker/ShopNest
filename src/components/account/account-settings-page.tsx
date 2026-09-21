"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";

export function AccountSettingsPage() {
  const router = useRouter();
  const { user, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/signin");
      return;
    }
    if (user.role !== "customer") {
      router.push(user.role === "seller" ? "/seller/dashboard" : "/admin/dashboard");
      return;
    }
    setName(user.name);
    setEmail(user.email);
  }, [router, user]);

  if (!user || user.role !== "customer") return null;

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const result = await updateProfile(name, email);
    setSaving(false);
    if (result.success) setMessage("Profile details saved.");
    else setError(result.error || "Could not save profile.");
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const result = await changePassword(currentPassword, newPassword);
    setSaving(false);
    if (result.success) {
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed successfully.");
    } else {
      setError(result.error || "Could not change password.");
    }
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Account Settings</h1>
        <p className="mt-2 text-sm text-muted">Manage your ShopNest profile and password.</p>
        <Link href="/support" className="mt-5 inline-flex rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand">Help & Support</Link>
        <div className="mt-8 space-y-6">
          <form onSubmit={submitProfile} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold">Profile details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">Name<input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 font-normal outline-none focus:ring-4 focus:ring-brand/20" required /></label>
              <label className="grid gap-2 text-sm font-medium">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 font-normal outline-none focus:ring-4 focus:ring-brand/20" required /></label>
            </div>
            <button type="submit" disabled={saving} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save profile"}</button>
          </form>
          <form onSubmit={submitPassword} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold">Change password</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">Current password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 font-normal outline-none focus:ring-4 focus:ring-brand/20" required /></label>
              <label className="grid gap-2 text-sm font-medium">New password<input type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 font-normal outline-none focus:ring-4 focus:ring-brand/20" required /></label>
            </div>
            <button type="submit" disabled={saving} className="mt-5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold disabled:opacity-60">Change password</button>
          </form>
          {message ? <p className="text-sm font-medium text-green-700">{message}</p> : null}
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        </div>
      </div>
    </Container>
  );
}
