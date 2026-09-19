"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { UserRole } from "@/types/user";
import { getSellerByUserId } from "@/lib/seller-storage";
import { validateAdminCredentials } from "@/lib/admin-storage";

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
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = "shopnest_users";
const CURRENT_USER_KEY = "shopnest_current_user";
const ADMIN_SESSION_KEY = "shopnest_admin_session";

// Helper functions for localStorage
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load current user on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    const adminSession = getAdminSession();
    if (adminSession) {
      setUser(adminSession);
    } else if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const isSeller = user?.role === "seller";
  const isAdmin = user?.role === "admin";

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
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
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
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
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
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
    
    // Check if user already exists
    const users = getStoredUsers();
    const existingUser = users.find((u) => u.email === email);
    
    if (existingUser) {
      setIsLoading(false);
      return { success: false, error: "An account with this email already exists" };
    }
    
    // Create new user
    const userId = "user-" + Date.now();
    const newUser: StoredUser = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: role,
    };
    
    // Save to storage
    users.push(newUser);
    saveStoredUsers(users);
    
    // Set as current user
    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    saveCurrentUser(userWithoutPassword);
    
    setIsLoading(false);
    return { success: true, userId, role: userWithoutPassword.role };
  };

  const signOut = () => {
    setUser(null);
    saveCurrentUser(null);
    saveAdminSession(null);
  };

  const updateProfile = async (name: string, email: string) => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!user || user.role !== "customer") return { success: false, error: "Only customer profiles can be updated here." };
    if (!trimmedName) return { success: false, error: "Name is required." };
    if (!normalizedEmail.includes("@")) return { success: false, error: "Enter a valid email address." };

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
    const users = getStoredUsers();
    const index = users.findIndex((storedUser) => storedUser.id === user.id);
    if (index < 0 || users[index].password !== currentPassword) return { success: false, error: "Current password is incorrect." };
    users[index] = { ...users[index], password: newPassword };
    saveStoredUsers(users);
    return { success: true };
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
        isLoading,
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
