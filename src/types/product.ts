export type ProductCategorySlug =
  | "home-living"
  | "fashion"
  | "electronics"
  | "beauty"
  | "sports"
  | "groceries";

export const PRODUCT_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];
export type SizeInventory = Partial<Record<ProductSize, number>>;

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
  sizes: ProductSize[];
  inventoryBySize?: SizeInventory;
};
