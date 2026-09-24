import { createClient } from "@/lib/supabase/client";
import type {
  Product,
  ProductCategorySlug,
  ProductFormData,
  ProductSize,
  SizeInventory,
} from "@/types/product";

export type ProductVariant = {
  id: string;
  productId: string;
  size?: ProductSize;
  color?: string;
  sku?: string;
  inventory: number;
  createdAt?: string;
};

export type ProductCategory = {
  id: string;
  slug: ProductCategorySlug;
  name: string;
  description: string | null;
  createdAt?: string;
};

type ProductWrite = {
  seller_id: string | null;
  category_id: string;
  slug: string;
  name: string;
  description: string;
  highlights: string[];
  price_cents: number;
  compare_at_price_cents: number | null;
  image_url: string | null;
  gallery: string[];
  inventory: number;
  approval_status?: Product["approvalStatus"];
  publish_status?: Product["publishStatus"];
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at?: string;
};

type SellerRow = {
  id: string;
  store_name: string;
};

type PublicSellerRow = {
  id: string;
  store_name: string;
};

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
  approval_status: Product["approvalStatus"];
  publish_status: Product["publishStatus"];
  created_at?: string;
  updated_at?: string;
  categories?: CategoryRow | CategoryRow[] | null;
  sellers?: SellerRow | SellerRow[] | null;
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

const CATEGORY_SLUGS: ProductCategorySlug[] = [
  "home-living",
  "fashion",
  "electronics",
  "beauty",
  "sports",
  "groceries",
];
const PRODUCT_SELECT = "*, categories:category_id(*), sellers:seller_id(id, store_name)";
const PUBLIC_PRODUCT_SELECT = "*, categories:category_id(*)";

function categorySlug(value: string | undefined): ProductCategorySlug {
  return CATEGORY_SLUGS.includes(value as ProductCategorySlug)
    ? (value as ProductCategorySlug)
    : "home-living";
}

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function toProduct(row: ProductRow, variants: ProductVariant[] = [], publicSeller?: PublicSellerRow | null): Product {
  const category = firstRelation(row.categories);
  const seller = publicSeller ?? firstRelation(row.sellers);
  const sizedVariants = variants.filter((variant) => variant.size);
  const inventoryBySize: SizeInventory = {};

  for (const variant of sizedVariants) {
    if (variant.size) inventoryBySize[variant.size] = variant.inventory;
  }

  return {
    id: row.id,
    slug: row.slug,
    sellerId: row.seller_id ?? "",
    sellerName: seller?.store_name ?? "ShopNest",
    name: row.name,
    description: row.description ?? "",
    highlights: row.highlights ?? [],
    priceCents: row.price_cents,
    compareAtPriceCents: row.compare_at_price_cents,
    imageUrl: row.image_url ?? "",
    gallery: row.gallery ?? [],
    category: categorySlug(category?.slug),
    inventory: row.inventory,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    sizes: sizedVariants.length ? sizedVariants.flatMap((variant) => variant.size ? [variant.size] : []) : undefined,
    inventoryBySize: sizedVariants.length ? inventoryBySize : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvalStatus: row.approval_status,
    publishStatus: row.publish_status,
  };
}

function toVariant(row: VariantRow): ProductVariant {
  const size = CATEGORY_SLUGS.length > 0 && ["S", "M", "L", "XL", "XXL"].includes(row.size ?? "")
    ? (row.size as ProductSize)
    : undefined;

  return {
    id: row.id,
    productId: row.product_id,
    size,
    color: row.color ?? undefined,
    sku: row.sku ?? undefined,
    inventory: row.inventory,
    createdAt: row.created_at,
  };
}

async function variantsForProduct(productId: string): Promise<ProductVariant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("size");

  if (error) throw error;
  return ((data ?? []) as unknown as VariantRow[]).map(toVariant);
}

async function productsQuery(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Product[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data as ProductRow[] | null ?? []);
  return Promise.all(rows.map(async (row) => toProduct(row, await variantsForProduct(row.id))));
}

async function publicProductsQuery(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Product[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data as ProductRow[] | null ?? []);
  const sellerIds = [...new Set(rows.map((row) => row.seller_id).filter((id): id is string => Boolean(id)))];
  const sellerById = new Map<string, PublicSellerRow>();

  if (sellerIds.length) {
    const supabase = createClient();
    const { data: sellers, error: sellerError } = await supabase
      .from("public_sellers")
      .select("id, store_name")
      .in("id", sellerIds);

    if (sellerError) throw sellerError;
    for (const seller of (sellers ?? []) as PublicSellerRow[]) {
      sellerById.set(seller.id, seller);
    }
  }

  return Promise.all(rows.map(async (row) => toProduct(
    row,
    await variantsForProduct(row.id),
    row.seller_id ? sellerById.get(row.seller_id) ?? null : null,
  )));
}

export async function getPublicProducts(): Promise<Product[]> {
  const supabase = createClient();
  return publicProductsQuery(
    supabase
      .from("products")
      .select(PUBLIC_PRODUCT_SELECT)
      .eq("approval_status", "approved")
      .eq("publish_status", "published")
      .order("created_at", { ascending: false }),
  );
}

export async function getProductBySlugFromSupabase(slug: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PUBLIC_PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as ProductRow;
  const { data: seller, error: sellerError } = await supabase
    .from("public_sellers")
    .select("id, store_name")
    .eq("id", row.seller_id)
    .maybeSingle();
  if (sellerError) throw sellerError;
  return toProduct(row, await variantsForProduct(row.id), seller as PublicSellerRow | null);
}

export async function getProductByIdFromSupabase(id: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as ProductRow;
  return toProduct(row, await variantsForProduct(row.id));
}

export async function getCategoriesFromSupabase(): Promise<ProductCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw error;
  return ((data ?? []) as unknown as CategoryRow[]).map((row) => ({
    id: row.id,
    slug: categorySlug(row.slug),
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  }));
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  return variantsForProduct(productId);
}

export async function getSellerProductsFromSupabase(sellerId: string): Promise<Product[]> {
  const supabase = createClient();
  return productsQuery(
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }),
  );
}

export async function getAdminProductsFromSupabase(): Promise<Product[]> {
  const supabase = createClient();
  return productsQuery(
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .order("created_at", { ascending: false }),
  );
}

export async function getSellerIdForUser(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sellers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? (data as { id: string }).id : null;
}

export async function createSellerInSupabase(userId: string, storeName: string, bio: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sellers")
    .insert({
      user_id: userId,
      store_name: storeName.trim(),
      bio: bio.trim(),
      approval_status: "pending",
      is_active: false,
      verification_status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

export async function ensureSellerInSupabase(userId: string, storeName: string, bio: string): Promise<string> {
  const existingSellerId = await getSellerIdForUser(userId);
  if (existingSellerId) return existingSellerId;
  return createSellerInSupabase(userId, storeName, bio);
}

export type SupabaseSeller = {
  id: string;
  user_id: string;
  store_name: string;
  bio: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  approval_status: "pending" | "approved" | "rejected";
  is_active: boolean;
  verification_status: "pending" | "verified" | "rejected";
  verification_note: string | null;
  created_at: string;
  updated_at: string;
};

export async function getSellerFromSupabase(userId: string): Promise<SupabaseSeller | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sellers")
    .select("id, user_id, store_name, bio, logo_url, contact_email, contact_phone, approval_status, is_active, verification_status, verification_note, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as SupabaseSeller | null;
}

export async function getAllSellersFromSupabase(): Promise<SupabaseSeller[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sellers")
    .select("id, user_id, store_name, bio, logo_url, contact_email, contact_phone, approval_status, is_active, verification_status, verification_note, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SupabaseSeller[];
}

export async function updateSellerProfileInSupabase(
  sellerId: string,
  updates: { storeName: string; bio: string; logoUrl?: string; contactEmail?: string; contactPhone?: string },
): Promise<SupabaseSeller> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sellers")
    .update({
      store_name: updates.storeName.trim(),
      bio: updates.bio.trim(),
      logo_url: updates.logoUrl?.trim() || null,
      contact_email: updates.contactEmail?.trim() || null,
      contact_phone: updates.contactPhone?.trim() || null,
    })
    .eq("id", sellerId)
    .select("id, user_id, store_name, bio, logo_url, contact_email, contact_phone, approval_status, is_active, verification_status, verification_note, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as SupabaseSeller;
}

export async function updateSellerModerationInSupabase(
  sellerId: string,
  updates: { approvalStatus?: SupabaseSeller["approval_status"]; isActive?: boolean; verificationStatus?: SupabaseSeller["verification_status"]; verificationNote?: string },
): Promise<SupabaseSeller> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sellers")
    .update({
      ...(updates.approvalStatus ? { approval_status: updates.approvalStatus } : {}),
      ...(updates.isActive === undefined ? {} : { is_active: updates.isActive }),
      ...(updates.verificationStatus ? { verification_status: updates.verificationStatus } : {}),
      ...(updates.verificationNote === undefined ? {} : { verification_note: updates.verificationNote.trim() || null }),
    })
    .eq("id", sellerId)
    .select("id, user_id, store_name, bio, logo_url, contact_email, contact_phone, approval_status, is_active, verification_status, verification_note, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as SupabaseSeller;
}

async function categoryIdForSlug(slug: ProductCategorySlug): Promise<string> {
  const categories = await getCategoriesFromSupabase();
  const category = categories.find((item) => item.slug === slug);
  if (!category) throw new Error(`Supabase category not found: ${slug}`);
  return category.id;
}

function productWrite(input: ProductFormData, sellerId: string | null, slug: string, approvalStatus: Product["approvalStatus"], publishStatus: Product["publishStatus"]): ProductWrite {
  const variantInventory = input.sizes.reduce(
    (total, size) => total + Math.max(0, Math.floor(input.inventoryBySize?.[size] ?? 0)),
    0,
  );

  return {
    seller_id: sellerId,
    category_id: "",
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    highlights: input.highlights.split(",").map((item) => item.trim()).filter(Boolean),
    price_cents: Math.max(0, Math.floor(input.priceCents)),
    compare_at_price_cents: input.compareAtPriceCents,
    image_url: input.imageUrl?.trim() || null,
    gallery: [],
    inventory: input.sizes.length > 0 ? variantInventory : Math.max(0, Math.floor(input.inventory)),
    approval_status: approvalStatus,
    publish_status: publishStatus,
  };
}

function variantWrites(productId: string, input: ProductFormData) {
  return input.sizes.map((size) => ({
    product_id: productId,
    size,
    color: null,
    sku: null,
    inventory: Math.max(0, Math.floor(input.inventoryBySize?.[size] ?? 0)),
  }));
}

async function syncProductVariants(productId: string, input: ProductFormData) {
  const supabase = createClient();
  const variants = variantWrites(productId, input);
  if (variants.length) {
    const { error } = await supabase
      .from("product_variants")
      .upsert(variants, { onConflict: "product_id,size,color" });
    if (error) throw error;
  }

  const sizes = input.sizes.map((size) => `"${size}"`).join(",");
  const query = supabase.from("product_variants").delete().eq("product_id", productId);
  const { error } = input.sizes.length
    ? await query.not("size", "in", `(${sizes})`)
    : await query;
  if (error) throw error;
}

export async function createSellerProductInSupabase(input: ProductFormData, sellerId: string, requestSlug?: string) {
  const supabase = createClient();
  const categoryId = await categoryIdForSlug(input.category);
  const slug = requestSlug ?? `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;

  const { data: existingData, error: existingError } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("seller_id", sellerId)
    .eq("slug", slug)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existingData) {
    return updateSellerProductInSupabase((existingData as unknown as ProductRow).id, input, sellerId);
  }

  const row = productWrite(input, sellerId, slug, "pending", "unpublished");
  row.category_id = categoryId;

  const { data, error } = await supabase.from("products").insert(row).select(PRODUCT_SELECT).single();
  if (error) throw error;
  const product = data as unknown as ProductRow;
  await syncProductVariants(product.id, input);
  return toProduct(product, await variantsForProduct(product.id));
}

export async function createAdminProductInSupabase(input: ProductFormData) {
  const supabase = createClient();
  const categoryId = await categoryIdForSlug(input.category);
  const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
  const row = productWrite(input, "", slug, "approved", "published");
  row.seller_id = null;
  row.category_id = categoryId;

  const { data, error } = await supabase.from("products").insert(row).select(PRODUCT_SELECT).single();
  if (error) throw error;
  const product = data as unknown as ProductRow;
  const variants = variantWrites(product.id, input);
  if (variants.length) {
    const { error: variantError } = await supabase.from("product_variants").insert(variants);
    if (variantError) throw variantError;
  }
  return toProduct(product);
}

export async function updateSellerProductInSupabase(productId: string, input: ProductFormData, sellerId: string) {
  const supabase = createClient();
  const categoryId = await categoryIdForSlug(input.category);
  const row = productWrite(input, sellerId, `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${productId.slice(0, 8)}`, "pending", "unpublished");
  row.category_id = categoryId;
  const { data, error } = await supabase
    .from("products")
    .update({
      category_id: row.category_id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      highlights: row.highlights,
      price_cents: row.price_cents,
      compare_at_price_cents: row.compare_at_price_cents,
      image_url: row.image_url,
      gallery: row.gallery,
      inventory: row.inventory,
    })
    .eq("id", productId)
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw error;

  await syncProductVariants(productId, input);
  return toProduct(data as unknown as ProductRow, await variantsForProduct(productId));
}

export async function updateAdminProductInSupabase(product: Product, input: ProductFormData) {
  const supabase = createClient();
  const categoryId = await categoryIdForSlug(input.category);
  const row = productWrite(input, product.sellerId || null, product.slug, product.approvalStatus, product.publishStatus);
  row.category_id = categoryId;
  const { data, error } = await supabase
    .from("products")
    .update({
      category_id: row.category_id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      highlights: row.highlights,
      price_cents: row.price_cents,
      compare_at_price_cents: row.compare_at_price_cents,
      image_url: row.image_url,
      gallery: row.gallery,
      inventory: row.inventory,
    })
    .eq("id", product.id)
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw error;

  const { error: deleteVariantsError } = await supabase.from("product_variants").delete().eq("product_id", product.id);
  if (deleteVariantsError) throw deleteVariantsError;
  const variants = variantWrites(product.id, input);
  if (variants.length) {
    const { error: variantError } = await supabase.from("product_variants").insert(variants);
    if (variantError) throw variantError;
  }
  return toProduct(data as unknown as ProductRow);
}

export async function deleteProductFromSupabase(productId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;
}

export async function updateProductModerationInSupabase(productId: string, approvalStatus: Product["approvalStatus"], publishStatus: Product["publishStatus"]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({ approval_status: approvalStatus, publish_status: publishStatus })
    .eq("id", productId);
  if (error) throw error;
}

export async function decrementProductInventory(productId: string, quantity: number): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("decrement_product_inventory", {
    p_product_id: productId,
    p_quantity: quantity,
  });

  if (error) throw error;
  return data === true;
}

export async function decrementVariantInventory(variantId: string, quantity: number): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("decrement_variant_inventory", {
    p_variant_id: variantId,
    p_quantity: quantity,
  });

  if (error) throw error;
  return data === true;
}

export async function reserveOrderInventory(
  items: Array<{ productId: string; size?: ProductSize; quantity: number }>,
): Promise<boolean> {
  const variantByProductAndSize = new Map<string, string>();
  for (const item of items.filter((entry) => entry.size)) {
    const variants = await variantsForProduct(item.productId);
    const variant = variants.find((candidate) => candidate.size === item.size);
    if (!variant) return false;
    variantByProductAndSize.set(`${item.productId}:${item.size}`, variant.id);
  }

  const payload = items.map((item) => ({
    product_id: item.size ? null : item.productId,
    variant_id: item.size ? variantByProductAndSize.get(`${item.productId}:${item.size}`) : null,
    quantity: item.quantity,
  }));
  const supabase = createClient();
  const { data, error } = await supabase.rpc("reserve_order_inventory", { p_items: payload });

  if (error) throw error;
  return data === true;
}
