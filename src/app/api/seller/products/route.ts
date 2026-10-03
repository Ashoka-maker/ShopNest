import { NextResponse } from "next/server";
import { getProductOptions } from "@/lib/product-options";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { PRODUCT_OPTION_TYPES, type ProductFormData, type ProductOptionType, type ProductCategorySlug } from "@/types/product";

const CATEGORY_SLUGS: ProductCategorySlug[] = [
  "home-living",
  "fashion",
  "electronics",
  "beauty",
  "sports",
  "groceries",
];

type SupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

class ProductDatabaseError extends Error {
  constructor(readonly operation: string, readonly databaseError: SupabaseError) {
    super(databaseError.message ?? "Supabase request failed");
  }
}

type ProductRow = {
  id: string;
  seller_id: string | null;
  category_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  highlights: string[] | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  image_url: string | null;
  gallery: string[] | null;
  inventory: number;
  rating: number;
  review_count: number;
  approval_status: "draft" | "pending" | "approved" | "rejected";
  publish_status: "published" | "unpublished";
  option_type: ProductOptionType | null;
  created_at?: string;
  updated_at?: string;
  categories?: { id: string; slug: string; name: string; description: string | null } | null;
  sellers?: { id: string; store_name: string } | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  inventory: number;
  created_at?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseProduct(value: unknown): ProductFormData | null {
  if (!isRecord(value)) return null;
  const { name, description, highlights, priceCents, compareAtPriceCents, category, inventory, imageUrl } = value;
  const optionType = value.optionType ?? "none";
  const sizes = value.sizes ?? [];
  const options = value.options ?? [];
  const inventoryBySize = value.inventoryBySize ?? {};

  if (
    typeof name !== "string" || !name.trim() || name.trim().length > 200 ||
    typeof description !== "string" || description.length > 10_000 ||
    typeof highlights !== "string" || highlights.length > 5_000 ||
    !isNonNegativeInteger(priceCents) ||
    (compareAtPriceCents !== null && !isNonNegativeInteger(compareAtPriceCents)) ||
    typeof category !== "string" || !CATEGORY_SLUGS.includes(category as ProductCategorySlug) ||
    !isNonNegativeInteger(inventory) ||
    (imageUrl !== undefined && (typeof imageUrl !== "string" || imageUrl.length > 3_000_000)) ||
    typeof optionType !== "string" || !PRODUCT_OPTION_TYPES.includes(optionType as ProductOptionType) ||
    !Array.isArray(sizes) || !sizes.every((size) => typeof size === "string" && size.length <= 100) ||
    !Array.isArray(options) || !options.every((option) =>
      isRecord(option) &&
      typeof option.value === "string" &&
      option.value.trim().length > 0 &&
      option.value.length <= 100 &&
      isNonNegativeInteger(option.inventory)
    ) ||
    !isRecord(inventoryBySize) ||
    !Object.values(inventoryBySize).every(isNonNegativeInteger)
  ) {
    return null;
  }

  return {
    name: name.trim(),
    description,
    highlights,
    priceCents,
    compareAtPriceCents,
    category: category as ProductCategorySlug,
    inventory,
    imageUrl: typeof imageUrl === "string" ? imageUrl : "",
    optionType: optionType as ProductOptionType,
    sizes: sizes as string[],
    options: options as ProductFormData["options"],
    inventoryBySize: inventoryBySize as ProductFormData["inventoryBySize"],
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function reportDatabaseError(error: ProductDatabaseError) {
  const { databaseError, operation } = error;
  const details = {
    operation,
    code: databaseError.code ?? null,
    message: databaseError.message ?? error.message,
    details: databaseError.details ?? null,
    hint: databaseError.hint ?? null,
  };
  console.error("Seller product Supabase operation failed:", {
    ...details,
    supabaseError: databaseError,
  });
  return NextResponse.json({ error: details }, { status: 500 });
}

function throwOnDatabaseError(operation: string, error: SupabaseError | null) {
  if (error) throw new ProductDatabaseError(operation, error);
}

async function syncVariants(
  admin: Awaited<ReturnType<typeof getSupabaseAdminClient>>,
  productId: string,
  input: ProductFormData,
) {
  const options = (input.optionType ?? "none") === "none" ? [] : getProductOptions(input);
  const { data, error } = await admin
    .from("product_variants")
    .select("id, product_id, size, color, sku, inventory, created_at")
    .eq("product_id", productId);
  throwOnDatabaseError("load product variants", error);

  const existing = (data ?? []) as VariantRow[];
  const optionKey = (value: string | null) => value?.trim().toLocaleLowerCase() ?? "";
  const desiredValues = new Set(options.map((option) => option.value.trim().toLocaleLowerCase()));

  for (const option of options) {
    const key = option.value.trim().toLocaleLowerCase();
    const matches = existing
      .filter((variant) => optionKey(variant.size || variant.color) === key)
      .sort((left, right) => right.inventory - left.inventory);

    if (matches.length) {
      const [canonical, ...duplicates] = matches;
      const { error: updateError } = await admin
        .from("product_variants")
        .update({
          product_id: productId,
          size: option.value,
          color: "",
          sku: null,
          inventory: option.inventory,
        })
        .eq("id", canonical.id);
      throwOnDatabaseError("update product variant", updateError);

      for (const duplicate of duplicates) {
        const { error: duplicateError } = await admin
          .from("product_variants")
          .update({ inventory: 0 })
          .eq("id", duplicate.id);
        throwOnDatabaseError("normalize duplicate product variant", duplicateError);
      }
    } else {
      const { error: insertError } = await admin.from("product_variants").insert({
        product_id: productId,
        size: option.value,
        color: "",
        sku: null,
        inventory: option.inventory,
      });
      throwOnDatabaseError("insert product variant", insertError);
    }
  }

  const staleIds = existing
    .filter((variant) => !desiredValues.has(optionKey(variant.size || variant.color)))
    .map((variant) => variant.id);
  if (staleIds.length) {
    const { error: deleteError } = await admin.from("product_variants").delete().in("id", staleIds);
    throwOnDatabaseError("delete stale product variants", deleteError);
  }

  const { data: variants, error: variantsError } = await admin
    .from("product_variants")
    .select("id, product_id, size, color, sku, inventory, created_at")
    .eq("product_id", productId)
    .order("size")
    .order("inventory", { ascending: false });
  throwOnDatabaseError("load saved product variants", variantsError);
  return (variants ?? []) as VariantRow[];
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "A valid JSON product payload is required" } }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: { message: "A product payload is required" } }, { status: 400 });
  }
  const input = parseProduct(body.product);
  if (!input) {
    return NextResponse.json({ error: { message: "The product details are invalid" } }, { status: 400 });
  }

  const requestedSlug = body.slug;
  if (requestedSlug !== undefined && (
    typeof requestedSlug !== "string" ||
    requestedSlug.length > 240 ||
    (requestedSlug.length > 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedSlug))
  )) {
    return NextResponse.json({ error: { message: "The product slug is invalid" } }, { status: 400 });
  }

  try {
    const authenticatedClient = await getSupabaseServerClient();
    const { data: authData, error: authError } = await authenticatedClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: { message: "Authentication required" } }, { status: 401 });
    }

    const admin = await getSupabaseAdminClient();
    const { data: seller, error: sellerError } = await admin
      .from("sellers")
      .select("id, store_name")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    throwOnDatabaseError("resolve authenticated seller", sellerError);
    if (!seller) {
      return NextResponse.json({ error: { message: "No seller account is associated with this user" } }, { status: 403 });
    }

    const { data: category, error: categoryError } = await admin
      .from("categories")
      .select("id, slug, name, description")
      .eq("slug", input.category)
      .maybeSingle();
    throwOnDatabaseError("validate product category", categoryError);
    if (!category) {
      return NextResponse.json({ error: { message: "The selected product category is unavailable" } }, { status: 400 });
    }

    const nameSlug = slugify(input.name);
    const baseSlug = (requestedSlug as string | undefined) || `${nameSlug || "product"}-${Date.now()}`;
    let slug = baseSlug;
    const { data: existing, error: existingError } = await admin
      .from("products")
      .select("id, seller_id")
      .eq("slug", slug)
      .maybeSingle();
    throwOnDatabaseError("check product slug", existingError);
    if (existing && existing.seller_id !== seller.id) {
      slug = `${baseSlug}-${seller.id.slice(0, 8)}`;
    }

    const { data: ownedExisting, error: ownedExistingError } = await admin
      .from("products")
      .select("id")
      .eq("seller_id", seller.id)
      .eq("slug", slug)
      .maybeSingle();
    throwOnDatabaseError("check seller product retry", ownedExistingError);

    const options = (input.optionType ?? "none") === "none" ? [] : getProductOptions(input);
    const row = {
      seller_id: seller.id,
      category_id: category.id,
      slug,
      name: input.name.trim(),
      description: input.description.trim(),
      highlights: input.highlights.split(",").map((item) => item.trim()).filter(Boolean),
      price_cents: input.priceCents,
      compare_at_price_cents: input.compareAtPriceCents,
      image_url: input.imageUrl?.trim() || null,
      gallery: [],
      inventory: options.length
        ? options.reduce((total, option) => total + option.inventory, 0)
        : input.inventory,
      option_type: input.optionType ?? (input.sizes.length > 0 ? "size" : "none"),
    };

    const productResult = ownedExisting
      ? await admin
        .from("products")
        .update(row)
        .eq("id", ownedExisting.id)
        .select("*, categories:category_id(*), sellers:seller_id(id, store_name)")
        .single()
      : await admin
        .from("products")
        .insert({ ...row, approval_status: "pending", publish_status: "unpublished" })
        .select("*, categories:category_id(*), sellers:seller_id(id, store_name)")
        .single();
    throwOnDatabaseError(ownedExisting ? "update retried seller product" : "insert seller product", productResult.error);

    let variants: VariantRow[];
    try {
      variants = await syncVariants(admin, productResult.data.id, input);
    } catch (error) {
      if (!ownedExisting) {
        const { error: cleanupError } = await admin.from("products").delete().eq("id", productResult.data.id);
        if (cleanupError) {
          console.error("Failed to clean up product after variant persistence failure:", {
            code: cleanupError.code ?? null,
            message: cleanupError.message,
            details: cleanupError.details ?? null,
            hint: cleanupError.hint ?? null,
          });
        }
      }
      throw error;
    }

    const product = productResult.data as ProductRow;
    return NextResponse.json({ product, variants });
  } catch (error) {
    if (error instanceof ProductDatabaseError) return reportDatabaseError(error);
    console.error("Seller product creation failed:", error);
    return NextResponse.json({ error: { message: "Unable to create seller product" } }, { status: 500 });
  }
}
