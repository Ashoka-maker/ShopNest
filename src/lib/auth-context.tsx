"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { UserRole } from "@/types/user";
import { getSellerByUserId } from "@/lib/seller-storage";
import { validateAdminCredentials } from "@/lib/admin-storage";
import { 
  getClientUser, 
  ensureProfile,
  provisionSeller,
  signUpClient, 
  signInClient, 
  signOutClient, 
  resetPasswordClient,
  updatePasswordClient 
} from "@/lib/supabase/auth-helpers";
import { getDataSourceMode } from "@/lib/adapters/config";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type StoredUser = User & {
  password: string;
};

type AuthContextType = {
  user: User | null;
  isSeller: boolean;
  isAdmin: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  adminSignIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    name: string,
    email: string,
    password: string,
    role?: UserRole,
  ) => Promise<{ success: boolean; error?: string; userId?: string; role?: UserRole }>;
  signOut: () => void;
  updateProfile: (name: string, email: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  isEmailVerified: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = "shopnest_users";
const CURRENT_USER_KEY = "shopnest_current_user";
const ADMIN_SESSION_KEY = "shopnest_admin_session";

// Helper functions for localStorage (fallback)
const getStoredUsers = (): StoredUser[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveStoredUsers = (users: StoredUser[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save users:", e);
  }
};

const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveCurrentUser = (user: User | null) => {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error("Failed to save current user:", e);
  }
};

const getAdminSession = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(ADMIN_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveAdminSession = (user: User | null) => {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch (e) {
    console.error("Failed to save admin session:", e);
  }
};

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
  profile?: {
    role?: string;
    full_name?: string;
    email?: string | null;
  };
  role?: string;
};

// Convert Supabase user to our User type
function convertSupabaseUser(supabaseUser: SupabaseAuthUser | null | undefined): User {
  if (!supabaseUser) {
    return {
      id: "",
      name: "User",
      email: "",
      role: "customer",
    };
  }

  const profileRole = supabaseUser.profile?.role ?? supabaseUser.role ?? supabaseUser.user_metadata?.role ?? "customer";
  const safeRole = profileRole === "seller" || profileRole === "admin" ? profileRole : "customer";

  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name || supabaseUser.profile?.full_name || supabaseUser.email?.split("@")[0] || "User",
    email: supabaseUser.email || supabaseUser.profile?.email || "",
    role: safeRole as User["role"],
  };
}

const SUPABASE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function ensureAuthenticatedIdentity(supabaseUser: SupabaseAuthUser, user: User): Promise<User> {
  if (!SUPABASE_UUID_PATTERN.test(supabaseUser.id)) {
    throw new Error("Supabase authentication returned an invalid user ID");
  }

  if (user.role === "seller" || supabaseUser.user_metadata?.role === "seller") {
    const seller = getSellerByUserId(supabaseUser.id);
    await provisionSeller(seller?.storeName ?? "", seller?.bio ?? "");
    const refreshedUser = await getClientUser();
    if (!refreshedUser || refreshedUser.profile?.role !== "seller") {
      throw new Error("Supabase seller profile was not provisioned with seller role");
    }
    return convertSupabaseUser(refreshedUser);
  }

  if (user.role === "customer") {
    await ensureProfile(supabaseUser.id, {
      email: supabaseUser.email ?? undefined,
      full_name: supabaseUser.user_metadata?.full_name ?? user.name,
      role: "customer",
    });
  }

  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [useSupabaseAuth, setUseSupabaseAuth] = useState(false);

  // Check if we should use Supabase auth
  useEffect(() => {
    const mode = getDataSourceMode();
    setUseSupabaseAuth(mode === "supabase" || mode === "hybrid");
  }, []);

  // Load current user on mount
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);

      if (useSupabaseAuth) {
        try {
          const supabaseUser = await getClientUser();
          if (supabaseUser) {
            const convertedUser = convertSupabaseUser(supabaseUser);
            const authenticatedUser = await ensureAuthenticatedIdentity(supabaseUser, convertedUser);
            setUser(authenticatedUser);
            setIsEmailVerified(supabaseUser.email_confirmed_at !== null);
          }
        } catch (error) {
          console.error("Supabase authentication initialization failed:", error);
          setUser(null);
        }
      } else {
        const currentUser = getCurrentUser();
        const adminSession = getAdminSession();
        if (adminSession) {
          setUser(adminSession);
        } else if (currentUser) {
          setUser(currentUser);
        }
      }

      setIsLoading(false);
    };

    void loadUser();
  }, [useSupabaseAuth]);

  const isSeller = user?.role === "seller";
  const isAdmin = user?.role === "admin";

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    setIsLoading(true);
    
    if (useSupabaseAuth) {
      try {
        const result = await signInClient(email, password);

        if (result.success && result.user) {
          const hydratedUser = await getClientUser();
          const convertedUser = convertSupabaseUser(hydratedUser ?? result.user);
          const authenticatedUser = await ensureAuthenticatedIdentity(hydratedUser ?? result.user, convertedUser);
          setUser(authenticatedUser);
          setIsEmailVerified((hydratedUser ?? result.user).email_confirmed_at !== null);
          setIsLoading(false);
          return { success: true, role: authenticatedUser.role };
        }

        setIsLoading(false);
        return { success: false, error: result.error || "Invalid email or password" };
      } catch (error) {
        console.error("Supabase sign in failed:", error);
        setIsLoading(false);
        return { success: false, error: error instanceof Error ? error.message : "Supabase authentication failed" };
      }
    }
    
    // LocalStorage auth
    const users = getStoredUsers();
    const foundUser = users.find((u) => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      saveCurrentUser(userWithoutPassword);
      setIsLoading(false);
      return { success: true, role: userWithoutPassword.role };
    }
    
    setIsLoading(false);
    return { success: false, error: "Invalid email or password" };
  };

  const adminSignIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    if (useSupabaseAuth) {
      try {
        const result = await signInClient(email, password);

        if (result.success && result.user) {
          const hydratedUser = await getClientUser();
          const convertedUser = convertSupabaseUser(hydratedUser ?? result.user);
          const profileRole = hydratedUser?.profile?.role;

          if (profileRole === "admin") {
            setUser(convertedUser);
            setIsLoading(false);
            return { success: true };
          }

          setIsLoading(false);
          return { success: false, error: "Access denied. Admin role required." };
        }

        setIsLoading(false);
        return { success: false, error: result.error || "Invalid admin credentials" };
      } catch (error) {
        console.error("Supabase admin sign in failed:", error);
        setIsLoading(false);
        return { success: false, error: error instanceof Error ? error.message : "Supabase authentication failed" };
      }
    }
    
    // LocalStorage auth
    if (validateAdminCredentials(email, password)) {
      const adminUser: User = {
        id: "admin-001",
        name: "Admin",
        email: email,
        role: "admin",
      };
      setUser(adminUser);
      saveAdminSession(adminUser);
      setIsLoading(false);
      return { success: true };
    }
    
    setIsLoading(false);
    return { success: false, error: "Invalid admin credentials" };
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    role: UserRole = "customer",
  ): Promise<{ success: boolean; error?: string; userId?: string; role?: UserRole }> => {
    setIsLoading(true);
    
    // Validate input
    if (!name || name.trim().length === 0) {
      setIsLoading(false);
      return { success: false, error: "Name is required" };
    }
    
    if (!email || !email.includes("@")) {
      setIsLoading(false);
      return { success: false, error: "Valid email is required" };
    }
    
    if (password.length < 6) {
      setIsLoading(false);
      return { success: false, error: "Password must be at least 6 characters" };
    }
    
    if (useSupabaseAuth) {
      try {
        const result = await signUpClient(email, password, name, role);

        if (result.success && result.user) {
          const hydratedUser = await getClientUser();
          const convertedUser = convertSupabaseUser(hydratedUser ?? result.user);
          const sellerUser = role === "seller" ? { ...convertedUser, role: "seller" as const } : convertedUser;
          setUser(sellerUser);
          setIsEmailVerified((hydratedUser ?? result.user).email_confirmed_at !== null);
          setIsLoading(false);

          if (result.needsEmailVerification) {
            if (role === "seller") {
              return {
                success: false,
                error: "Seller account created. Verify your email, then sign in through Supabase to continue.",
              };
            }

            return {
              success: true,
              userId: result.user.id,
              role: convertedUser.role,
              error: "Please check your email to verify your account before signing in.",
            };
          }

          if (role !== "seller") {
            const authenticatedUser = await ensureAuthenticatedIdentity(hydratedUser ?? result.user, convertedUser);
            setUser(authenticatedUser);
          }

          return { success: true, userId: result.user.id, role: convertedUser.role };
        }

        setIsLoading(false);
        return { success: false, error: result.error || "Unable to create account" };
      } catch (error) {
        console.error("Supabase sign up failed:", error);
        setIsLoading(false);
        return { success: false, error: error instanceof Error ? error.message : "Supabase account creation failed" };
      }
    }
    
    // LocalStorage auth
    const users = getStoredUsers();
    const existingUser = users.find((u) => u.email === email);
    
    if (existingUser) {
      setIsLoading(false);
      return { success: false, error: "An account with this email already exists" };
    }
    
    const userId = "user-" + Date.now();
    const newUser: StoredUser = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: role,
    };
    
    users.push(newUser);
    saveStoredUsers(users);
    
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    saveCurrentUser(userWithoutPassword);
    
    setIsLoading(false);
    return { success: true, userId, role: userWithoutPassword.role };
  };

  const signOut = async () => {
    if (useSupabaseAuth) {
      try {
        await signOutClient();
      } catch (error) {
        console.error("Supabase sign out error:", error);
      }
    }
    
    setUser(null);
    saveCurrentUser(null);
    saveAdminSession(null);
    setIsEmailVerified(false);
  };

  const updateProfile = async (name: string, email: string) => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!user || user.role !== "customer") return { success: false, error: "Only customer profiles can be updated here." };
    if (!trimmedName) return { success: false, error: "Name is required." };
    if (!normalizedEmail.includes("@")) return { success: false, error: "Enter a valid email address." };

    if (useSupabaseAuth) {
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        const { error } = await supabase.auth.updateUser({
          email: normalizedEmail,
          data: { full_name: trimmedName },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        // Update profile in database
        const { upsertProfile } = await import("@/lib/supabase/auth-helpers");
        const profileUpdated = await upsertProfile(user.id, {
          email: normalizedEmail,
          full_name: trimmedName,
        }, false);

        if (!profileUpdated) {
          return { success: false, error: "Failed to update profile" };
        }

        setUser({ ...user, name: trimmedName, email: normalizedEmail });
        return { success: true };
      } catch (error) {
        console.error("Supabase profile update failed:", error);
        return { success: false, error: error instanceof Error ? error.message : "Supabase profile update failed" };
      }
    }

    // LocalStorage auth
    const users = getStoredUsers();
    const duplicate = users.find((storedUser) => storedUser.email === normalizedEmail && storedUser.id !== user.id);
    if (duplicate) return { success: false, error: "An account with this email already exists." };
    const index = users.findIndex((storedUser) => storedUser.id === user.id);
    if (index < 0) return { success: false, error: "Account could not be found." };

    const updatedUser = { ...users[index], name: trimmedName, email: normalizedEmail };
    users[index] = updatedUser;
    saveStoredUsers(users);
    const sessionUser: User = { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role };
    setUser(sessionUser);
    saveCurrentUser(sessionUser);
    return { success: true };
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || user.role !== "customer") return { success: false, error: "Only customer passwords can be changed here." };
    if (newPassword.length < 6) return { success: false, error: "New password must be at least 6 characters." };

    if (useSupabaseAuth) {
      try {
        const result = await updatePasswordClient(newPassword);
        
        if (!result.success) {
          return { success: false, error: result.error || "Failed to update password" };
        }

        return { success: true };
      } catch (error) {
        console.error("Supabase password change failed:", error);
        return { success: false, error: error instanceof Error ? error.message : "Supabase password change failed" };
      }
    }

    // LocalStorage auth
    const users = getStoredUsers();
    const index = users.findIndex((storedUser) => storedUser.id === user.id);
    if (index < 0 || users[index].password !== currentPassword) return { success: false, error: "Current password is incorrect." };
    users[index] = { ...users[index], password: newPassword };
    saveStoredUsers(users);
    return { success: true };
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters." };
    }

    if (useSupabaseAuth) {
      try {
        const result = await updatePasswordClient(newPassword);
        return result;
      } catch (error) {
        console.error("Supabase password update error:", error);
        return { success: false, error: "Password update is only available with Supabase authentication" };
      }
    }

    return { success: false, error: "Password update is only available with Supabase authentication" };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Valid email is required" };
    }

    if (useSupabaseAuth) {
      try {
        const result = await resetPasswordClient(email);
        return result;
      } catch (error) {
        console.error("Supabase password reset error:", error);
        return { success: false, error: "Password reset is only available with Supabase authentication" };
      }
    }

    return { success: false, error: "Password reset is only available with Supabase authentication" };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isSeller,
        isAdmin,
        signIn,
        adminSignIn,
        signUp,
        signOut,
        updateProfile,
        changePassword,
        updatePassword,
        resetPassword,
        isLoading,
        isEmailVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
