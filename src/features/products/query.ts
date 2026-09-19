import { CATEGORIES, type SortValue } from "@/lib/constants";
import { getAllProducts } from "@/features/products/data";
import type { Product, ProductCategorySlug } from "@/types/product";
import { getAvailableInventoryById } from "@/lib/inventory-storage";
import { getReviewSummary } from "@/lib/review-storage";

export type CatalogQuery = {
  q?: string;
  category?: string;
  sort?: string;
  price?: string;
  availability?: string;
};

export function isCategorySlug(value: string): value is ProductCategorySlug {
  return CATEGORIES.some((category) => category.slug === value);
}

export function parseSort(value: string | undefined): SortValue {
  if (
    value === "price-asc" ||
    value === "price-desc" ||
    value === "rating-desc" ||
    value === "featured"
  ) {
    return value;
  }

  return "featured";
}

export function parsePrice(value: string | undefined) {
  return value === "under-1000" || value === "1000-5000" || value === "over-5000"
    ? value
    : "all";
}

export function parseAvailability(value: string | undefined) {
  return value === "in-stock" || value === "out-of-stock" ? value : "all";
}

export function getCategoryBySlug(slug: string | undefined) {
  if (!slug || !isCategorySlug(slug)) {
    return null;
  }

  return CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function queryProducts({ q, category, sort, price, availability }: CatalogQuery): Product[] {
  const needle = q?.trim().toLowerCase() ?? "";
  const categorySlug = category && isCategorySlug(category) ? category : null;
  const sortValue = parseSort(sort);
  const priceValue = parsePrice(price);
  const availabilityValue = parseAvailability(availability);

  const allProducts = getAllProducts();

  const filtered = allProducts.filter((product) => {
    // Filter out unapproved seller products
    if ("approvalStatus" in product && product.approvalStatus !== "approved") {
      return false;
    }

    if (categorySlug && product.category !== categorySlug) {
      return false;
    }

    if (
      (priceValue === "under-1000" && product.priceCents >= 100000) ||
      (priceValue === "1000-5000" && (product.priceCents < 100000 || product.priceCents > 500000)) ||
      (priceValue === "over-5000" && product.priceCents <= 500000)
    ) {
      return false;
    }

    const availableInventory = getAvailableInventoryById(product.id, product.inventory);
    if (
      (availabilityValue === "in-stock" && availableInventory <= 0) ||
      (availabilityValue === "out-of-stock" && availableInventory > 0)
    ) {
      return false;
    }

    if (!needle) {
      return true;
    }

    const haystack = [
      product.name,
      product.description,
      product.sellerName,
      ...product.highlights,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });

  const ordered = [...filtered];

  if (sortValue === "price-asc") {
    ordered.sort((a, b) => a.priceCents - b.priceCents);
  } else if (sortValue === "price-desc") {
    ordered.sort((a, b) => b.priceCents - a.priceCents);
  } else if (sortValue === "rating-desc") {
    ordered.sort((a, b) => {
      const aSummary = getReviewSummary(a.id);
      const bSummary = getReviewSummary(b.id);
      const aRating = aSummary.reviewCount ? aSummary.rating : a.rating;
      const bRating = bSummary.reviewCount ? bSummary.rating : b.rating;
      const aCount = aSummary.reviewCount || a.reviewCount;
      const bCount = bSummary.reviewCount || b.reviewCount;
      return bRating - aRating || bCount - aCount;
    });
  }

  return ordered;
}

export function catalogHref(query: CatalogQuery) {
  const params = new URLSearchParams();

  if (query.q?.trim()) {
    params.set("q", query.q.trim());
  }

  if (query.category && isCategorySlug(query.category)) {
    params.set("category", query.category);
  }

  const price = parsePrice(query.price);
  if (price !== "all") params.set("price", price);

  const availability = parseAvailability(query.availability);
  if (availability !== "all") params.set("availability", availability);

  const sort = parseSort(query.sort);
  if (sort !== "featured") {
    params.set("sort", sort);
  }

  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}
