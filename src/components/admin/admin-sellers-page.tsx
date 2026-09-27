"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getAllSellers, approveSeller, rejectSeller, toggleSellerActive, updateSellerVerification } from "@/lib/admin-storage";
import { SELLERS_UPDATED_EVENT } from "@/lib/seller-storage";
import { getAllSellersFromSupabase, updateSellerModerationInSupabase } from "@/lib/supabase/product-repository";
import { getDataSourceMode } from "@/lib/adapters/config";
import type { Seller } from "@/types/seller";

export function AdminSellersPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const useSupabase = getDataSourceMode() === "supabase" || getDataSourceMode() === "hybrid";

  useEffect(() => {
    if (!user || !isAdmin) {
      router.push("/admin/login");
      return;
    }

    const loadSellers = async () => {
      setSupabaseError(null);
      try {
        if (useSupabase) {
          const remoteSellers = await getAllSellersFromSupabase();
          setSellers(remoteSellers.map((remoteSeller) => ({
            id: remoteSeller.id,
            userId: remoteSeller.user_id,
            supabaseSellerId: remoteSeller.id,
            storeName: remoteSeller.store_name,
            bio: remoteSeller.bio ?? "",
            logoUrl: remoteSeller.logo_url ?? undefined,
            contactEmail: remoteSeller.contact_email ?? undefined,
            contactPhone: remoteSeller.contact_phone ?? undefined,
            approvalStatus: remoteSeller.approval_status,
            isActive: remoteSeller.is_active,
            verificationStatus: remoteSeller.verification_status,
            verificationNote: remoteSeller.verification_note ?? undefined,
          })));
        } else {
          setSellers(getAllSellers());
        }
      } catch (error) {
        console.error("Unable to load Supabase sellers:", error);
        if (useSupabase) {
          setSellers([]);
          setSupabaseError("Unable to load sellers from Supabase. Local seller data was not used.");
        } else {
          setSellers(getAllSellers());
        }
      }
      setLoading(false);
    };

    void loadSellers();
    const refresh = () => void loadSellers();
    window.addEventListener(SELLERS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SELLERS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [user, isAdmin, router, useSupabase]);

  const handleApproveSeller = async (sellerId: string) => {
    const seller = sellers.find((item) => item.id === sellerId);
    if (useSupabase) {
      if (!seller?.supabaseSellerId) {
        setSupabaseError("Seller has no Supabase record; approval was not changed.");
        return;
      }
      try {
        const remote = await updateSellerModerationInSupabase(seller.supabaseSellerId, { approvalStatus: "approved", isActive: true });
        setSellers((current) => current.map((item) => item.id === sellerId ? { ...item, approvalStatus: remote.approval_status, isActive: remote.is_active } : item));
      } catch (error) {
        console.error("Unable to approve Supabase seller:", error);
        setSupabaseError("Unable to save seller approval to Supabase.");
      }
    } else if (approveSeller(sellerId)) {
      setSellers(getAllSellers());
    }
  };

  const handleRejectSeller = async (sellerId: string) => {
    if (!confirm("Are you sure you want to reject this seller?")) return;

    const seller = sellers.find((item) => item.id === sellerId);
    if (useSupabase) {
      if (!seller?.supabaseSellerId) {
        setSupabaseError("Seller has no Supabase record; rejection was not changed.");
        return;
      }
      try {
        const remote = await updateSellerModerationInSupabase(seller.supabaseSellerId, { approvalStatus: "rejected", isActive: false });
        setSellers((current) => current.map((item) => item.id === sellerId ? { ...item, approvalStatus: remote.approval_status, isActive: remote.is_active } : item));
      } catch (error) {
        console.error("Unable to reject Supabase seller:", error);
        setSupabaseError("Unable to save seller rejection to Supabase.");
      }
    } else if (rejectSeller(sellerId)) {
      setSellers(getAllSellers());
    }
  };

  const handleToggleActive = async (sellerId: string) => {
    const seller = sellers.find((item) => item.id === sellerId);
    if (useSupabase) {
      if (!seller?.supabaseSellerId) {
        setSupabaseError("Seller has no Supabase record; activation was not changed.");
        return;
      }
      try {
        const remote = await updateSellerModerationInSupabase(seller.supabaseSellerId, { isActive: !seller.isActive });
        setSellers((current) => current.map((item) => item.id === sellerId ? { ...item, isActive: remote.is_active } : item));
      } catch (error) {
        console.error("Unable to update Supabase seller activation:", error);
        setSupabaseError("Unable to save seller activation to Supabase.");
      }
    } else if (toggleSellerActive(sellerId)) {
      setSellers(getAllSellers());
    }
  };

  const handleVerification = async (sellerId: string, status: "pending" | "verified" | "rejected") => {
    const seller = sellers.find((item) => item.id === sellerId);
    if (useSupabase) {
      if (!seller?.supabaseSellerId) {
        setSupabaseError("Seller has no Supabase record; verification was not changed.");
        return;
      }
      try {
        const remote = await updateSellerModerationInSupabase(seller.supabaseSellerId, { verificationStatus: status, verificationNote: verificationNotes[sellerId] ?? "" });
        setSellers((current) => current.map((item) => item.id === sellerId ? { ...item, verificationStatus: remote.verification_status, verificationNote: remote.verification_note ?? undefined } : item));
      } catch (error) {
        console.error("Unable to update Supabase seller verification:", error);
        setSupabaseError("Unable to save seller verification to Supabase.");
      }
    } else if (updateSellerVerification(sellerId, status, verificationNotes[sellerId])) {
      setSellers(getAllSellers());
    }
  };

  if (loading) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-border rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-border rounded w-1/2"></div>
          </div>
        </div>
      </Container>
    );
  }

  const pendingSellers = sellers.filter(s => s.approvalStatus === "pending");
  const approvedSellers = sellers.filter(s => s.approvalStatus === "approved");

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Seller Management
            </h1>
            <p className="mt-2 text-base text-muted">
              Approve and manage seller accounts
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
        {supabaseError && <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{supabaseError}</p>}

        {/* Pending Sellers */}
        {pendingSellers.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden mb-8">
            <div className="p-6 border-b border-border bg-accent/5">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Pending Approval ({pendingSellers.length})
              </h2>
            </div>

            <div className="divide-y divide-border">
              {pendingSellers.map((seller) => (
                <div key={seller.id} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{seller.storeName}</h3>
                      <p className="text-sm text-muted mt-1">{seller.bio}</p>
                      <p className="text-xs text-muted mt-2">
                        Seller ID: {seller.id} • User ID: {seller.userId}
                      </p>
                      <p className="text-xs text-muted">
                        Applied: {new Date(seller.createdAt).toLocaleDateString()}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-muted">Verification: {seller.verificationStatus || "Pending"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproveSeller(seller.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectSeller(seller.id)}
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Sellers */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Approved Sellers ({approvedSellers.length})
            </h2>
          </div>

          {sellers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base text-muted">
                No sellers found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Store
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-background/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm">{seller.storeName}</p>
                          <p className="text-xs text-muted">{seller.bio.substring(0, 50)}...</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            seller.verificationStatus === "verified" ? "bg-blue-100 text-blue-800" : seller.verificationStatus === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {seller.verificationStatus === "verified" ? "Verified" : seller.verificationStatus === "rejected" ? "Rejected" : "Pending"}
                          </span>
                          <input
                            value={verificationNotes[seller.id] ?? seller.verificationNote ?? ""}
                            onChange={(event) => setVerificationNotes((current) => ({ ...current, [seller.id]: event.target.value }))}
                            placeholder="Optional note"
                            className="w-40 rounded-lg border border-border px-2 py-1 text-xs"
                          />
                          <div className="flex flex-wrap gap-1">
                            <button type="button" onClick={() => handleVerification(seller.id, "verified")} className="text-xs font-semibold text-blue-700">Verify</button>
                            <button type="button" onClick={() => handleVerification(seller.id, "rejected")} className="text-xs font-semibold text-red-700">Reject</button>
                            <button type="button" onClick={() => handleVerification(seller.id, "pending")} className="text-xs font-semibold text-muted">Pending</button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          seller.approvalStatus === "approved"
                            ? "bg-green-100 text-green-800"
                            : seller.approvalStatus === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {seller.approvalStatus.charAt(0).toUpperCase() + seller.approvalStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          seller.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {seller.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">
                        {new Date(seller.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {seller.approvalStatus === "approved" && (
                            <button
                              onClick={() => handleToggleActive(seller.id)}
                              className="text-sm font-medium text-brand hover:text-brand-dark"
                            >
                              {seller.isActive ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
