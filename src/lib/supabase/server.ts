import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { UserRole } from "@/types/user";

function getSupabaseAnonKey() {
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(
      "Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return supabaseKey;
}

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

export async function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin credentials");
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");

  return createAdminClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getServerUser() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    ...user,
    profile,
  };
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return (profile?.role as UserRole) || null;
}

export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const userRole = await getUserRole(userId);
  return userRole === role;
}

export async function isAdmin(userId: string): Promise<boolean> {
  return await hasRole(userId, "admin");
}

export async function isSeller(userId: string): Promise<boolean> {
  return await hasRole(userId, "seller");
}

export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  return !error;
}

export async function upsertProfileServer(userId: string, data: {
  email?: string;
  full_name?: string;
  role?: UserRole;
}): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      ...data,
      updated_at: new Date().toISOString(),
    });

  return !error;
}

export async function signOutServer() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
}

export async function createAdminUser(email: string, password: string, name: string = "Admin") {
  const supabase = await getSupabaseAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      role: "admin",
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const serverClient = await getSupabaseServerClient();
  if (data.user) {
    const { error: profileError } = await serverClient
      .from("profiles")
      .upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: name,
        role: "admin",
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      return { success: false, error: "Failed to create admin profile" };
    }
  }

  return { success: true, user: data.user };
}

export async function signUpUserServiceRole(email: string, password: string, name: string, role: UserRole = "customer") {
  const supabase = await getSupabaseAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      role,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const serverClient = await getSupabaseServerClient();
  if (data.user) {
    const { error: profileError } = await serverClient
      .from("profiles")
      .upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: name,
        role,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      return { success: false, error: "Failed to create user profile" };
    }
  }

  return { success: true, user: data.user };
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
