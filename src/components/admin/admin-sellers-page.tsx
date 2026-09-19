"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getAllSellers, approveSeller, rejectSeller, toggleSellerActive } from "@/lib/admin-storage";
import type { Seller } from "@/types/seller";

export function AdminSellersPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) {
      router.push("/admin/login");
      return;
    }

    const loadSellers = () => {
      const allSellers = getAllSellers();
      setSellers(allSellers);
      setLoading(false);
    };

    loadSellers();
  }, [user, isAdmin, router]);

  const handleApproveSeller = async (sellerId: string) => {
    const success = approveSeller(sellerId);
    if (success) {
      const updatedSellers = getAllSellers();
      setSellers(updatedSellers);
    }
  };

  const handleRejectSeller = async (sellerId: string) => {
    if (!confirm("Are you sure you want to reject this seller?")) return;

    const success = rejectSeller(sellerId);
    if (success) {
      const updatedSellers = getAllSellers();
      setSellers(updatedSellers);
    }
  };

  const handleToggleActive = async (sellerId: string) => {
    const success = toggleSellerActive(sellerId);
    if (success) {
      const updatedSellers = getAllSellers();
      setSellers(updatedSellers);
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
