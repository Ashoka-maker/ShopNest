import type { Product } from "@/types/product";
import { deleteSellerProduct, getSellerProducts, saveSellerProduct } from "@/lib/seller-storage";
import { getPublicProducts, updateProductModerationInSupabase } from "@/lib/supabase/product-repository";
import { getDataSourceMode } from "@/lib/adapters/config";

const PRODUCT_CATALOG_KEY = "shopnest_product_catalog";
export const PRODUCT_CATALOG_UPDATED_EVENT = "shopnest:product-catalog-updated";
export const SUPABASE_PRODUCTS_UPDATED_EVENT = "shopnest:supabase-products-updated";
let supabaseProducts: Product[] | null = null;
type ProductCatalogState = {
  products: Product[];
  deletedProductIds: string[];
};

function seedCatalogProducts(): Product[] {
  const sellerProducts = getSellerProducts("").map((product) => ({
    ...product,
    rating: 0,
    reviewCount: 0,
    publishStatus: product.publishStatus ?? (product.approvalStatus === "approved" ? "published" : "unpublished"),
  }));
  return [...STATIC_PRODUCTS.map((product) => ({
    ...product,
    approvalStatus: product.approvalStatus ?? "approved",
    publishStatus: product.publishStatus ?? "published",
  })), ...sellerProducts];
}

function readCatalogState(): ProductCatalogState {
  if (typeof window === "undefined") return { products: STATIC_PRODUCTS, deletedProductIds: [] };
  try {
    const stored = localStorage.getItem(PRODUCT_CATALOG_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    const state: ProductCatalogState = Array.isArray(parsed)
      ? { products: parsed, deletedProductIds: [] }
      : {
          products: Array.isArray(parsed?.products) ? parsed.products : [],
          deletedProductIds: Array.isArray(parsed?.deletedProductIds) ? parsed.deletedProductIds : [],
        };
    const deleted = new Set(state.deletedProductIds);
    const existing = new Map(state.products.map((product) => [product.id, product]));
    for (const product of seedCatalogProducts()) {
      if (!deleted.has(product.id) && !existing.has(product.id)) existing.set(product.id, product);
    }
    const migrated = { products: [...existing.values()], deletedProductIds: [...deleted] };
    if (!stored || Array.isArray(parsed) || migrated.products.length !== state.products.length) {
      writeCatalogState(migrated);
    }
    return migrated;
  } catch {
    return { products: seedCatalogProducts(), deletedProductIds: [] };
  }
}

function writeCatalogState(state: ProductCatalogState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRODUCT_CATALOG_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(PRODUCT_CATALOG_UPDATED_EVENT));
}

export function getCatalogProductsForAdmin(): Product[] {
  return readCatalogState().products;
}

export function saveCatalogProduct(product: Product): boolean {
  const state = readCatalogState();
  const index = state.products.findIndex((item) => item.id === product.id);
  if (index >= 0) state.products[index] = product;
  else state.products.push(product);
  state.deletedProductIds = state.deletedProductIds.filter((id) => id !== product.id);
  writeCatalogState(state);
  if (product.id.startsWith("p-") && getSellerProducts("").some((item) => item.id === product.id)) {
    saveSellerProduct({ ...product, updatedAt: new Date().toISOString(), createdAt: product.createdAt ?? new Date().toISOString(), approvalStatus: product.approvalStatus === "rejected" ? "rejected" : product.approvalStatus === "draft" ? "pending" : "approved" }, product.sellerId);
  }
  const useSupabase = getDataSourceMode() === "supabase" || getDataSourceMode() === "hybrid";
  if (useSupabase && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.id)) {
    void updateProductModerationInSupabase(product.id, product.approvalStatus, product.publishStatus)
      .then(() => {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PRODUCT_CATALOG_UPDATED_EVENT));
      })
      .catch((error: unknown) => console.error("Unable to update Supabase product moderation:", error));
  }
  return true;
}

export async function moderateCatalogProduct(product: Product): Promise<boolean> {
  const useSupabase = getDataSourceMode() === "supabase" || getDataSourceMode() === "hybrid";
  const isSupabaseProduct = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.id);

  if (useSupabase && isSupabaseProduct) {
    try {
      await updateProductModerationInSupabase(product.id, product.approvalStatus, product.publishStatus);
    } catch (error) {
      console.error("Unable to update Supabase product moderation; retaining local catalog:", error);
      saveCatalogProduct(product);
      return false;
    }
  }

  saveCatalogProduct(product);
  return true;
}

export function deleteCatalogProduct(productId: string): boolean {
  const state = readCatalogState();
  if (!state.products.some((item) => item.id === productId)) return false;
  state.products = state.products.filter((item) => item.id !== productId);
  state.deletedProductIds = [...new Set([...state.deletedProductIds, productId])];
  writeCatalogState(state);
  deleteSellerProduct(productId);
  return true;
}

function img(seed: string) {
  return `https://picsum.photos/seed/${seed}/1200/900`;
}

export const STATIC_PRODUCTS: Product[] = [
  {
    id: "p-linen-duvet",
    slug: "stonewashed-linen-duvet-set",
    sellerId: "s-hearth-house",
    sellerName: "Hearth & House",
    name: "Stonewashed Linen Duvet Set",
    description:
      "A breathable three-piece linen duvet set that softens with every wash. Includes a duvet cover and two pillow shams in a warm oat shade that works year-round.",
    highlights: [
      "100% European flax linen",
      "Queen size with hidden buttons",
      "Pre-washed for a lived-in drape",
    ],
    priceCents: 18900,
    compareAtPriceCents: 24000,
    imageUrl: img("linen-duvet"),
    gallery: [img("linen-duvet-room")],
    category: "home-living",
    inventory: 18,
    rating: 4.8,
    reviewCount: 214,
  },
  {
    id: "p-gooseneck-kettle",
    slug: "matte-gooseneck-kettle",
    sellerId: "s-hearth-house",
    sellerName: "Hearth & House",
    name: "Matte Gooseneck Kettle",
    description:
      "Precision-pour kettle with a balanced handle and fine spout for pour-over coffee or loose-leaf tea. The matte charcoal finish hides fingerprints.",
    highlights: [
      "1.2 L stainless steel body",
      "Stovetop safe",
      "Stay-cool handle",
    ],
    priceCents: 6400,
    compareAtPriceCents: 7900,
    imageUrl: img("gooseneck-kettle"),
    gallery: [img("gooseneck-kettle-pour")],
    category: "home-living",
    inventory: 40,
    rating: 4.6,
    reviewCount: 89,
  },
  {
    id: "p-walnut-board",
    slug: "end-grain-walnut-board",
    sellerId: "s-grain-studio",
    sellerName: "Grain Studio",
    name: "End-Grain Walnut Board",
    description:
      "A heavyweight chopping board with an end-grain surface that is kinder to knives. Finished with food-safe oil and juice groove.",
    highlights: [
      "American black walnut",
      "18 × 12 in work surface",
      "Rubber feet for stability",
    ],
    priceCents: 9800,
    compareAtPriceCents: null,
    imageUrl: img("walnut-board"),
    gallery: [img("walnut-board-kitchen")],
    category: "home-living",
    inventory: 22,
    rating: 4.9,
    reviewCount: 61,
  },
  {
    id: "p-cloud-throw",
    slug: "cloud-knit-throw",
    sellerId: "s-hearth-house",
    sellerName: "Hearth & House",
    name: "Cloud Knit Throw",
    description:
      "A chunky knit throw for reading nooks and late-night movies. Lightweight enough for spring, cozy enough for winter evenings.",
    highlights: [
      "Machine-washable acrylic blend",
      "50 × 60 in",
      "Tassel edges",
    ],
    priceCents: 5200,
    compareAtPriceCents: 6800,
    imageUrl: img("cloud-throw"),
    gallery: [img("cloud-throw-sofa")],
    category: "home-living",
    inventory: 35,
    rating: 4.4,
    reviewCount: 132,
  },
  {
    id: "p-merino-crew",
    slug: "merino-crewneck-sweater",
    sellerId: "s-north-loom",
    sellerName: "North Loom",
    name: "Merino Crewneck Sweater",
    description:
      "Fine-gauge merino that layers under a coat or stands on its own. Ribbed cuffs and a slightly relaxed fit keep it easy for travel days.",
    highlights: [
      "100% extra-fine merino",
      "Unisex sizing",
      "Naturally odor resistant",
    ],
    priceCents: 12800,
    compareAtPriceCents: 15500,
    imageUrl: img("merino-crew"),
    gallery: [img("merino-crew-style")],
    category: "fashion",
    inventory: 27,
    rating: 4.7,
    reviewCount: 176,
  },
  {
    id: "p-canvas-tote",
    slug: "structured-canvas-tote",
    sellerId: "s-field-bag",
    sellerName: "Field Bag Co.",
    name: "Structured Canvas Tote",
    description:
      "A weekday tote with a boxed base, interior laptop sleeve, and leather handles that break in quickly. Holds a 15-inch laptop plus a water bottle.",
    highlights: [
      "12 oz organic canvas",
      "Padded 15 in sleeve",
      "Magnetic snap closure",
    ],
    priceCents: 7400,
    compareAtPriceCents: null,
    imageUrl: img("canvas-tote"),
    gallery: [img("canvas-tote-detail")],
    category: "fashion",
    inventory: 44,
    rating: 4.5,
    reviewCount: 98,
  },
  {
    id: "p-leather-belt",
    slug: "full-grain-leather-belt",
    sellerId: "s-north-loom",
    sellerName: "North Loom",
    name: "Full-Grain Leather Belt",
    description:
      "Vegetable-tanned leather with a solid brass buckle. Cut for everyday jeans or a tucked-in shirt, and built to last a decade of wear.",
    highlights: [
      "Full-grain hide",
      "Brass buckle",
      "1.25 in width",
    ],
    priceCents: 5800,
    compareAtPriceCents: 7200,
    imageUrl: img("leather-belt"),
    gallery: [img("leather-belt-buckle")],
    category: "fashion",
    inventory: 50,
    rating: 4.6,
    reviewCount: 54,
  },
  {
    id: "p-denim-jacket",
    slug: "washed-denim-jacket",
    sellerId: "s-north-loom",
    sellerName: "North Loom",
    name: "Washed Denim Jacket",
    description:
      "A medium-wash trucker jacket with a broken-in feel from day one. Chest pockets, adjustable waist tabs, and a lining light enough for three seasons.",
    highlights: [
      "13 oz cotton denim",
      "Classic trucker cut",
      "Copper hardware",
    ],
    priceCents: 11800,
    compareAtPriceCents: 14500,
    imageUrl: img("denim-jacket"),
    gallery: [img("denim-jacket-back")],
    category: "fashion",
    inventory: 19,
    rating: 4.3,
    reviewCount: 81,
  },
  {
    id: "p-quiet-headphones",
    slug: "quiet-over-ear-headphones",
    sellerId: "s-signal-lab",
    sellerName: "Signal Lab",
    name: "Quiet Over-Ear Headphones",
    description:
      "Wireless headphones with adaptive noise cancelling, 32-hour battery, and a folding case for commuting. Tuned for voices and long listening sessions.",
    highlights: [
      "Adaptive ANC",
      "32-hour battery",
      "USB-C fast charge",
    ],
    priceCents: 24900,
    compareAtPriceCents: 29900,
    imageUrl: img("quiet-headphones"),
    gallery: [img("quiet-headphones-case")],
    category: "electronics",
    inventory: 31,
    rating: 4.7,
    reviewCount: 402,
  },
  {
    id: "p-pocket-speaker",
    slug: "pocket-bluetooth-speaker",
    sellerId: "s-signal-lab",
    sellerName: "Signal Lab",
    name: "Pocket Bluetooth Speaker",
    description:
      "A compact speaker with surprisingly wide stereo for desks, kitchens, and park blankets. IPX7 water resistance and a 12-hour charge.",
    highlights: [
      "IPX7 water resistant",
      "12-hour playtime",
      "Pair two for stereo",
    ],
    priceCents: 7900,
    compareAtPriceCents: 9900,
    imageUrl: img("pocket-speaker"),
    gallery: [img("pocket-speaker-desk")],
    category: "electronics",
    inventory: 60,
    rating: 4.4,
    reviewCount: 228,
  },
  {
    id: "p-desk-lamp",
    slug: "arc-led-desk-lamp",
    sellerId: "s-lumen-works",
    sellerName: "Lumen Works",
    name: "Arc LED Desk Lamp",
    description:
      "An adjustable LED lamp with three color temperatures and a USB-C charging port in the base. The weighted stand stays put on crowded desks.",
    highlights: [
      "2700K–5000K lighting",
      "USB-C charging port",
      "Touch dimmer",
    ],
    priceCents: 6900,
    compareAtPriceCents: null,
    imageUrl: img("arc-lamp"),
    gallery: [img("arc-lamp-desk")],
    category: "electronics",
    inventory: 38,
    rating: 4.5,
    reviewCount: 147,
  },
  {
    id: "p-charge-pad",
    slug: "dual-wireless-charge-pad",
    sellerId: "s-signal-lab",
    sellerName: "Signal Lab",
    name: "Dual Wireless Charge Pad",
    description:
      "Charge a phone and earbuds at once on a slim fabric-wrapped pad. Foreign-object detection and a braided cable keep the nightstand tidy.",
    highlights: [
      "15W fast wireless",
      "Two charging coils",
      "Fabric-wrapped shell",
    ],
    priceCents: 4500,
    compareAtPriceCents: 5900,
    imageUrl: img("charge-pad"),
    gallery: [img("charge-pad-nightstand")],
    category: "electronics",
    inventory: 72,
    rating: 4.2,
    reviewCount: 93,
  },
  {
    id: "p-vitamin-c",
    slug: "daily-vitamin-c-serum",
    sellerId: "s-grove-lab",
    sellerName: "Grove Lab",
    name: "Daily Vitamin C Serum",
    description:
      "A 15% vitamin C serum with ferulic acid and hyaluronic acid for morning routines. Lightweight, fast-absorbing, and packaged in a UV-protective dropper.",
    highlights: [
      "15% L-ascorbic acid",
      "Fragrance-free",
      "30 ml dropper bottle",
    ],
    priceCents: 3600,
    compareAtPriceCents: 4400,
    imageUrl: img("vitamin-c-serum"),
    gallery: [img("vitamin-c-texture")],
    category: "beauty",
    inventory: 80,
    rating: 4.6,
    reviewCount: 319,
  },
  {
    id: "p-oat-cleanser",
    slug: "oat-milk-cleanser",
    sellerId: "s-grove-lab",
    sellerName: "Grove Lab",
    name: "Oat Milk Cleanser",
    description:
      "A creamy gel cleanser that lifts SPF and city dust without tightness. Colloidal oatmeal and glycerin leave skin comfortable after evening wash-off.",
    highlights: [
      "pH-balanced formula",
      "Suitable for sensitive skin",
      "150 ml tube",
    ],
    priceCents: 2200,
    compareAtPriceCents: null,
    imageUrl: img("oat-cleanser"),
    gallery: [img("oat-cleanser-sink")],
    category: "beauty",
    inventory: 95,
    rating: 4.8,
    reviewCount: 267,
  },
  {
    id: "p-mineral-spf",
    slug: "sheer-mineral-spf-30",
    sellerId: "s-grove-lab",
    sellerName: "Grove Lab",
    name: "Sheer Mineral SPF 30",
    description:
      "A zinc-based daily sunscreen that layers under makeup without a heavy white cast. Water-resistant for 40 minutes of errands or a lunch walk.",
    highlights: [
      "Non-nano zinc oxide",
      "Reef-conscious formula",
      "50 ml pump",
    ],
    priceCents: 2800,
    compareAtPriceCents: 3400,
    imageUrl: img("mineral-spf"),
    gallery: [img("mineral-spf-bottle")],
    category: "beauty",
    inventory: 64,
    rating: 4.3,
    reviewCount: 141,
  },
  {
    id: "p-hair-oil",
    slug: "botanical-hair-oil",
    sellerId: "s-grove-lab",
    sellerName: "Grove Lab",
    name: "Botanical Hair Oil",
    description:
      "A blend of argan, jojoba, and rosemary oil for ends and scalp massage. A few drops tame frizz without weighing hair down.",
    highlights: [
      "Cold-pressed oils",
      "Silicone-free",
      "50 ml glass bottle",
    ],
    priceCents: 2400,
    compareAtPriceCents: 3000,
    imageUrl: img("hair-oil"),
    gallery: [img("hair-oil-dropper")],
    category: "beauty",
    inventory: 58,
    rating: 4.5,
    reviewCount: 188,
  },
  {
    id: "p-yoga-mat",
    slug: "grip-plus-yoga-mat",
    sellerId: "s-trail-form",
    sellerName: "Trailform",
    name: "Grip Plus Yoga Mat",
    description:
      "A 5 mm natural-rubber mat with a closed-cell top that stays tacky through vinyasa. Includes a carry strap for studio and park sessions.",
    highlights: [
      "Natural rubber base",
      "5 mm cushion",
      "72 in length",
    ],
    priceCents: 7800,
    compareAtPriceCents: 9600,
    imageUrl: img("yoga-mat"),
    gallery: [img("yoga-mat-studio")],
    category: "sports",
    inventory: 41,
    rating: 4.7,
    reviewCount: 205,
  },
  {
    id: "p-road-runners",
    slug: "cloudfoam-road-runners",
    sellerId: "s-trail-form",
    sellerName: "Trailform",
    name: "Cloudfoam Road Runners",
    description:
      "Daily trainers with a responsive foam midsole and a knit upper that breathes on warm miles. Neutral ride from easy jogs to tempo work.",
    highlights: [
      "Cloudfoam midsole",
      "Breathable knit upper",
      "8.2 oz (men's 9)",
    ],
    priceCents: 13500,
    compareAtPriceCents: 16000,
    imageUrl: img("road-runners"),
    gallery: [img("road-runners-pair")],
    category: "sports",
    inventory: 29,
    rating: 4.6,
    reviewCount: 356,
  },
  {
    id: "p-band-set",
    slug: "three-pack-resistance-bands",
    sellerId: "s-trail-form",
    sellerName: "Trailform",
    name: "Three-Pack Resistance Bands",
    description:
      "Light, medium, and heavy loop bands for warm-ups, travel workouts, and physical therapy. Printed tension ratings take the guesswork out.",
    highlights: [
      "Natural latex",
      "Light / medium / heavy",
      "Includes mesh pouch",
    ],
    priceCents: 1800,
    compareAtPriceCents: 2400,
    imageUrl: img("resistance-bands"),
    gallery: [img("resistance-bands-set")],
    category: "sports",
    inventory: 110,
    rating: 4.4,
    reviewCount: 173,
  },
  {
    id: "p-insulated-bottle",
    slug: "double-wall-water-bottle",
    sellerId: "s-trail-form",
    sellerName: "Trailform",
    name: "Double-Wall Water Bottle",
    description:
      "A 24 oz bottle that keeps water cold through a workday hike. Leak-proof lid, wide mouth for ice, and a powder-coat that resists chips.",
    highlights: [
      "24-hour cold / 12-hour hot",
      "24 oz capacity",
      "Dishwasher-safe lid",
    ],
    priceCents: 3200,
    compareAtPriceCents: null,
    imageUrl: img("water-bottle"),
    gallery: [img("water-bottle-hike")],
    category: "sports",
    inventory: 86,
    rating: 4.8,
    reviewCount: 421,
  },
  {
    id: "p-ethiopia-coffee",
    slug: "ethiopia-yirgacheffe-beans",
    sellerId: "s-kiln-coffee",
    sellerName: "Kiln Coffee",
    name: "Ethiopia Yirgacheffe Beans",
    description:
      "A washed Yirgacheffe with jasmine, lemon, and honey notes. Roasted in small batches and bagged with a one-way valve for freshness.",
    highlights: [
      "12 oz whole bean",
      "Light-medium roast",
      "Roasted to order",
    ],
    priceCents: 2100,
    compareAtPriceCents: 2500,
    imageUrl: img("yirgacheffe-beans"),
    gallery: [img("yirgacheffe-pour")],
    category: "groceries",
    inventory: 70,
    rating: 4.9,
    reviewCount: 512,
  },
  {
    id: "p-olive-oil",
    slug: "early-harvest-olive-oil",
    sellerId: "s-coastal-grove",
    sellerName: "Coastal Grove",
    name: "Early Harvest Olive Oil",
    description:
      "Peppery extra-virgin oil from early-harvest Arbequina olives. Best for finishing salads, grilled vegetables, and good bread.",
    highlights: [
      "500 ml dark glass",
      "Cold-extracted",
      "Single estate",
    ],
    priceCents: 2800,
    compareAtPriceCents: 3400,
    imageUrl: img("olive-oil"),
    gallery: [img("olive-oil-pour")],
    category: "groceries",
    inventory: 48,
    rating: 4.7,
    reviewCount: 164,
  },
  {
    id: "p-maple-granola",
    slug: "maple-almond-granola",
    sellerId: "s-kiln-coffee",
    sellerName: "Kiln Coffee",
    name: "Maple Almond Granola",
    description:
      "Oven-baked oats with maple syrup, toasted almonds, and coconut flakes. Crunchy clusters that work over yogurt or by the handful.",
    highlights: [
      "12 oz bag",
      "No refined sugar",
      "Small-batch baked",
    ],
    priceCents: 1400,
    compareAtPriceCents: null,
    imageUrl: img("maple-granola"),
    gallery: [img("maple-granola-bowl")],
    category: "groceries",
    inventory: 90,
    rating: 4.5,
    reviewCount: 239,
  },
  {
    id: "p-dark-chocolate",
    slug: "seventy-percent-dark-bar",
    sellerId: "s-coastal-grove",
    sellerName: "Coastal Grove",
    name: "70% Dark Chocolate Bar",
    description:
      "A single-origin bar with cocoa from the Dominican Republic. Smooth melt, low bitterness, and a hint of dried cherry.",
    highlights: [
      "70% cacao",
      "2.5 oz bar",
      "Bean to bar",
    ],
    priceCents: 900,
    compareAtPriceCents: 1100,
    imageUrl: img("dark-chocolate"),
    gallery: [img("dark-chocolate-squares")],
    category: "groceries",
    inventory: 140,
    rating: 4.6,
    reviewCount: 301,
  },
];

export function getProductBySlug(slug: string) {
  return getAllProducts().find((product) => product.slug === slug) ?? null;
}

export function getRelatedProducts(product: Product, limit = 4) {
  const related = getAllProducts().filter(
    (item) => item.category === product.category && item.id !== product.id,
  );

  // Add seller products if we need more
  if (related.length < limit) {
    const sellerProducts = getSellerProducts("");
    const sellerRelated = sellerProducts
      .filter(
        (item) =>
          item.approvalStatus === "approved" &&
          item.category === product.category &&
          item.id !== product.id,
      )
      .map((sp) => ({ ...sp, rating: 0, reviewCount: 0 }));

    related.push(...sellerRelated);
  }

  return related.slice(0, limit);
}

export function getAllProducts(): Product[] {
  const products = supabaseProducts ?? readCatalogState().products;
  return products.filter(
    (product) => product.approvalStatus === "approved" && product.publishStatus === "published",
  );
}

export async function loadSupabaseProducts(): Promise<Product[]> {
  try {
    const products = await getPublicProducts();
    supabaseProducts = products;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SUPABASE_PRODUCTS_UPDATED_EVENT));
    }
    return products;
  } catch (error) {
    console.error("Supabase product read failed; retaining local catalog during migration:", error);
    return getAllProducts();
  }
}

// Export PRODUCTS for backward compatibility
export const PRODUCTS = getAllProducts();
