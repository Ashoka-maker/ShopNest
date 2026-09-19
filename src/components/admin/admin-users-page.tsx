"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { getAllUsers, deleteUser } from "@/lib/admin-storage";
import type { User } from "@/types/user";

const getSafeRole = (role: User["role"] | null | undefined): NonNullable<User["role"]> =>
  role === "admin" || role === "seller" || role === "customer" ? role : "customer";

export function AdminUsersPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) {
      router.push("/admin/login");
      return;
    }

    const loadUsers = () => {
      const allUsers = getAllUsers();
      setUsers(allUsers);
      setLoading(false);
    };

    loadUsers();
  }, [user, isAdmin, router]);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    const success = deleteUser(userId);
    if (success) {
      const updatedUsers = getAllUsers();
      setUsers(updatedUsers);
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

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              User Management
            </h1>
            <p className="mt-2 text-base text-muted">
              Manage all user accounts
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              All Users ({users.length})
            </h2>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base text-muted">
                No users found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-background/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
                            <span className="text-brand font-semibold text-sm">
                              {userItem.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{userItem.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {userItem.email}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const role = getSafeRole(userItem.role);
                          return (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          role === "admin" 
                            ? "bg-purple-100 text-purple-800" 
                            : role === "seller"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">
                        {userItem.id}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {getSafeRole(userItem.role) !== "admin" && (
                          <button
                            onClick={() => handleDeleteUser(userItem.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
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
