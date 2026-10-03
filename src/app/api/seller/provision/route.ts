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

function logProvisioning(
  event: string,
  userId: string,
  profileRole: string | null,
  metadataRole: string | null,
  details: Record<string, unknown> = {},
) {
  console.info("Seller provisioning:", {
    event,
    userId,
    profileRole,
    metadataRole,
    ...details,
  });
}

function logProvisioningError(
  event: string,
  userId: string,
  profileRole: string | null,
  metadataRole: string | null,
  error: { code?: string; message?: string },
) {
  console.error("Seller provisioning failed:", {
    event,
    userId,
    profileRole,
    metadataRole,
    error: {
      code: error.code ?? null,
      message: error.message ?? "Supabase request failed",
    },
  });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    console.error("Seller provisioning authentication failed:", {
      code: authError?.code ?? null,
      message: authError?.message ?? "Authentication is required",
    });
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
  const metadataRole = typeof authData.user.user_metadata?.role === "string"
    ? authData.user.user_metadata.role
    : null;
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

  const profileRole = typeof existingProfile?.role === "string" ? existingProfile.role : null;
  logProvisioning("seller lookup completed", authData.user.id, profileRole, metadataRole, {
    profileFound: Boolean(existingProfile),
    sellerFound: Boolean(existingSeller),
    sellerId: existingSeller?.id ?? null,
  });

  if (profileLookupError) {
    logProvisioningError("profile lookup", authData.user.id, profileRole, metadataRole, profileLookupError);
    return NextResponse.json({ error: supabaseError(profileLookupError) }, { status: 500 });
  }
  if (sellerLookupError) {
    logProvisioningError("seller lookup", authData.user.id, profileRole, metadataRole, sellerLookupError);
    return NextResponse.json({ error: supabaseError(sellerLookupError) }, { status: 500 });
  }

  if (metadataRole === "admin" || profileRole === "admin") {
    logProvisioning("administrator provisioning rejected", authData.user.id, profileRole, metadataRole);
    return NextResponse.json({ error: { message: "Administrator accounts cannot be provisioned as sellers" } }, { status: 403 });
  }

  if (profileRole !== "seller") {
    const { error: profileError } = await admin.from("profiles").upsert({
      id: authData.user.id,
      email: existingProfile?.email ?? authData.user.email,
      full_name: existingProfile?.full_name ?? authData.user.user_metadata?.full_name ?? null,
      role: "seller",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      logProvisioningError("profile role upsert", authData.user.id, profileRole, metadataRole, profileError);
      return NextResponse.json({ error: supabaseError(profileError) }, { status: 500 });
    }
  }

  if (existingSeller) {
    logProvisioning("existing seller returned", authData.user.id, profileRole, metadataRole, {
      sellerId: existingSeller.id,
    });
    return NextResponse.json({ sellerId: existingSeller.id });
  }

  const metadataStoreName = authData.user.user_metadata?.store_name;
  const metadataBio = authData.user.user_metadata?.store_bio;
  const emailPrefix = authData.user.email?.split("@")[0]?.trim();
  const storeName = (body.storeName as string | undefined)?.trim()
    || (validText(metadataStoreName) ? metadataStoreName.trim() : "")
    || existingProfile?.full_name?.trim()
    || (validText(authData.user.user_metadata?.full_name) ? authData.user.user_metadata.full_name.trim() : "")
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
        logProvisioningError("concurrent seller lookup", authData.user.id, profileRole, metadataRole, concurrentLookupError);
        return NextResponse.json({ error: supabaseError(concurrentLookupError) }, { status: 500 });
      }
      if (concurrentSeller) {
        logProvisioning("concurrent seller returned", authData.user.id, profileRole, metadataRole, {
          sellerId: concurrentSeller.id,
        });
        return NextResponse.json({ sellerId: concurrentSeller.id });
      }
    }
    logProvisioningError("seller insert", authData.user.id, profileRole, metadataRole, sellerError);
    return NextResponse.json({ error: supabaseError(sellerError) }, { status: 500 });
  }

  logProvisioning("seller created", authData.user.id, profileRole, metadataRole, {
    sellerId: seller.id,
  });
  return NextResponse.json({ sellerId: seller.id });
}
