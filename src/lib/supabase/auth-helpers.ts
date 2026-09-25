/**
 * Client-safe Supabase Auth helpers for ShopNest.
 *
 * This module must stay free of next/headers and server-only imports because it is
 * consumed by Client Components such as src/lib/auth-context.tsx.
 */

import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/user";

function normalizeUserRole(role?: string): UserRole {
  if (role === "seller") return "seller";
  return "customer";
}

/**
 * Create or update a user profile from the browser client.
 * Server-side usage should be handled in the dedicated server module.
 */
export async function upsertProfile(userId: string, data: {
  email?: string;
  full_name?: string;
  role?: UserRole;
}, useServerClient: boolean = false): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    });

  return !error;
}

export async function ensureProfile(userId: string, data: {
  email?: string;
  full_name?: string;
  role?: UserRole;
}) {
  const updated = await upsertProfile(userId, data);
  if (!updated) throw new Error("Unable to provision the Supabase profile");
}

export async function provisionSeller(storeName: string, bio: string): Promise<string> {
  const response = await fetch("/api/seller/provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeName, bio, role: "seller" }),
  });
  const result = await response.json().catch(() => null) as { sellerId?: string; error?: { message?: string } } | null;

  if (!response.ok || !result?.sellerId) {
    throw new Error(result?.error?.message ?? `Seller provisioning failed with status ${response.status}`);
  }

  return result.sellerId;
}

/**
 * Client-side: Get current user
 */
export async function getClientUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // During Phase 2, profile reads may be unavailable until RLS is added in Phase 3.
  // Fall back to Auth metadata when the profiles table is not accessible yet.
  let profile = null;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    profile = data;
  } catch {
    profile = null;
  }

  return {
    ...user,
    profile,
  };
}

/**
 * Client-side: Sign up new user
 */
export async function signUpClient(email: string, password: string, name: string, role: UserRole = "customer") {
  const safeRole = normalizeUserRole(role);
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        role: safeRole,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    user: data.user,
    needsEmailVerification: !data.session,
  };
}

/**
 * Client-side: Sign in user
 */
export async function signInClient(email: string, password: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}

/**
 * Client-side: Sign out
 */
export async function signOutClient() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/**
 * Client-side: Reset password
 */
export async function resetPasswordClient(email: string) {
  const supabase = createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Client-side: Update password
 */
export async function updatePasswordClient(newPassword: string) {
  const supabase = createClient();
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
