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

  // Create profile only when the table is writable. Phase 2 keeps auth metadata as the source of truth
  // until Phase 3 adds the proper RLS policies and database authorization.
  if (data.user) {
    try {
      const profileError = !(await upsertProfile(data.user.id, {
        email: data.user.email,
        full_name: name,
        role: safeRole,
      }, false));

      if (profileError) {
        console.warn("Supabase profile creation is not yet available; continuing with Auth metadata only.");
      }
    } catch (error) {
      console.warn("Supabase profile creation skipped during Phase 2 auth setup:", error);
    }
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
