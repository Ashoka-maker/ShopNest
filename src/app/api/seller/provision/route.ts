import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";

type ProvisionRequest = {
  storeName?: string;
  bio?: string;
};

function supabaseError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  return {
    code: error.code ?? null,
    message: error.message ?? "Supabase request failed",
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
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

  const admin = await getSupabaseAdminClient();
  const { data: existingProfile, error: profileLookupError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileLookupError) {
    return NextResponse.json({ error: supabaseError(profileLookupError) }, { status: 500 });
  }

  if (existingProfile?.role !== "seller" && authData.user.user_metadata?.role !== "seller") {
    return NextResponse.json({ error: { message: "Seller role is required" } }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as ProvisionRequest;
  const storeName = body.storeName?.trim() ?? "";
  const bio = body.bio?.trim() ?? "";

  if (!storeName || !bio) {
    return NextResponse.json({ error: { message: "Store name and bio are required" } }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: authData.user.id,
    email: authData.user.email,
    full_name: authData.user.user_metadata?.full_name ?? storeName,
    role: "seller",
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return NextResponse.json({ error: supabaseError(profileError) }, { status: 500 });
  }

  const { data: existingSeller, error: sellerLookupError } = await admin
    .from("sellers")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (sellerLookupError) {
    return NextResponse.json({ error: supabaseError(sellerLookupError) }, { status: 500 });
  }

  if (existingSeller) {
    return NextResponse.json({ sellerId: existingSeller.id });
  }

  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .insert({
      user_id: authData.user.id,
      store_name: storeName,
      bio,
      approval_status: "pending",
      is_active: false,
      verification_status: "pending",
    })
    .select("id")
    .single();

  if (sellerError) {
    return NextResponse.json({ error: supabaseError(sellerError) }, { status: 500 });
  }

  return NextResponse.json({ sellerId: seller.id });
}