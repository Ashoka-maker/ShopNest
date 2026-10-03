import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";

type ProvisionRequest = {
  storeName?: unknown;
  bio?: unknown;
};

function supabaseError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  return {
    code: error.code ?? null,
    message: error.message ?? "Supabase request failed",
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function validText(value: unknown): value is string {
  return typeof value === "string";
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError ? supabaseError(authError) : { message: "Authentication is required" } },
      { status: 401 },
    );
  }

  let body: ProvisionRequest;
  try {
    const parsedBody: unknown = await request.json();
    if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: { message: "A seller details object is required" } }, { status: 400 });
    }
    body = parsedBody as ProvisionRequest;
  } catch {
    return NextResponse.json({ error: { message: "A valid JSON request is required" } }, { status: 400 });
  }

  if (
    (body.storeName !== undefined && !validText(body.storeName)) ||
    (body.bio !== undefined && !validText(body.bio))
  ) {
    return NextResponse.json({ error: { message: "Seller details must be text" } }, { status: 400 });
  }

  const admin = await getSupabaseAdminClient();
  const [{ data: existingProfile, error: profileLookupError }, { data: existingSeller, error: sellerLookupError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", authData.user.id)
        .maybeSingle(),
      admin
        .from("sellers")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle(),
    ]);

  if (profileLookupError) {
    return NextResponse.json({ error: supabaseError(profileLookupError) }, { status: 500 });
  }
  if (sellerLookupError) {
    return NextResponse.json({ error: supabaseError(sellerLookupError) }, { status: 500 });
  }

  const metadataRole = authData.user.user_metadata?.role;
  if (metadataRole === "admin" || existingProfile?.role === "admin") {
    return NextResponse.json({ error: { message: "Administrator accounts cannot be provisioned as sellers" } }, { status: 403 });
  }
  if (metadataRole !== "seller" && existingProfile?.role !== "seller") {
    return NextResponse.json({ error: { message: "A seller-authenticated account is required" } }, { status: 403 });
  }

  if (existingProfile?.role !== "seller") {
    const { error: profileError } = await admin.from("profiles").upsert({
      id: authData.user.id,
      email: existingProfile?.email ?? authData.user.email,
      full_name: existingProfile?.full_name ?? authData.user.user_metadata?.full_name ?? null,
      role: "seller",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return NextResponse.json({ error: supabaseError(profileError) }, { status: 500 });
    }
  }

  if (existingSeller) {
    return NextResponse.json({ sellerId: existingSeller.id });
  }

  const metadataStoreName = authData.user.user_metadata?.store_name;
  const metadataBio = authData.user.user_metadata?.store_bio;
  const emailPrefix = authData.user.email?.split("@")[0]?.trim();
  const storeName = (body.storeName as string | undefined)?.trim()
    || (validText(metadataStoreName) ? metadataStoreName.trim() : "")
    || existingProfile?.full_name?.trim()
    || emailPrefix
    || "ShopNest Store";
  const bio = (body.bio as string | undefined)?.trim()
    || (validText(metadataBio) ? metadataBio.trim() : "");

  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .insert({
      user_id: authData.user.id,
      store_name: storeName,
      bio: bio || null,
      approval_status: "pending",
      is_active: false,
      verification_status: "pending",
    })
    .select("id")
    .single();

  if (sellerError) {
    if (sellerError.code === "23505") {
      const { data: concurrentSeller, error: concurrentLookupError } = await admin
        .from("sellers")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (concurrentLookupError) {
        return NextResponse.json({ error: supabaseError(concurrentLookupError) }, { status: 500 });
      }
      if (concurrentSeller) return NextResponse.json({ sellerId: concurrentSeller.id });
    }
    return NextResponse.json({ error: supabaseError(sellerError) }, { status: 500 });
  }

  return NextResponse.json({ sellerId: seller.id });
}
