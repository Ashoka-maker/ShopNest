export type ProductCategorySlug =
  | "home-living"
  | "fashion"
  | "electronics"
  | "beauty"
  | "sports"
  | "groceries";

export const PRODUCT_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export const PRODUCT_OPTION_TYPES = ["size", "shoe-size", "slipper-size", "color", "other", "none"] as const;
export type ProductOptionType = (typeof PRODUCT_OPTION_TYPES)[number];
export type ProductOptionValue = string;
export type ProductSize = ProductOptionValue;
export type SizeInventory = Partial<Record<ProductOptionValue, number>>;

export type ProductOption = {
  value: ProductOptionValue;
  inventory: number;
  variantId?: string;
};

export const PRODUCT_OPTION_PRESETS: Partial<Record<ProductOptionType, readonly string[]>> = {
  size: PRODUCT_SIZES,
  "shoe-size": ["6", "7", "8", "9", "10", "11"],
  "slipper-size": ["6", "7", "8", "9", "10"],
};

export type Product = {
  id: string;
  slug: string;
  sellerId: string;
  sellerName: string;
  name: string;
  description: string;
  highlights: string[];
  priceCents: number;
  compareAtPriceCents: number | null;
  imageUrl: string;
  gallery: string[];
  category: ProductCategorySlug;
  inventory: number;
  rating: number;
  reviewCount: number;
  optionType?: ProductOptionType;
  options?: ProductOption[];
  sizes?: ProductSize[];
  inventoryBySize?: SizeInventory;
  createdAt?: string;
  updatedAt?: string;
  approvalStatus?: "draft" | "pending" | "approved" | "rejected";
  publishStatus?: "published" | "unpublished";
};

export type SellerProduct = {
  id: string;
  slug: string;
  sellerId: string;
  sellerName: string;
  name: string;
  description: string;
  highlights: string[];
  priceCents: number;
  compareAtPriceCents: number | null;
  imageUrl: string;
  gallery: string[];
  category: ProductCategorySlug;
  inventory: number;
  createdAt: string;
  updatedAt: string;
  approvalStatus: "draft" | "pending" | "approved" | "rejected";
  publishStatus?: "published" | "unpublished";
  optionType?: ProductOptionType;
  options?: ProductOption[];
  sizes?: ProductSize[];
  inventoryBySize?: SizeInventory;
};

export type ProductFormData = {
  name: string;
  description: string;
  highlights: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  category: ProductCategorySlug;
  inventory: number;
  imageUrl?: string;
  optionType?: ProductOptionType;
  options?: ProductOption[];
  sizes: ProductSize[];
  inventoryBySize?: SizeInventory;
};
