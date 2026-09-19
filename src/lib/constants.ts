export const SITE_NAME = "ShopNest";

export const NAV_LINKS = [
  { href: "/products", label: "Shop" },
  { href: "/seller/signup", label: "Sell" },
  { href: "/#about", label: "About" },
] as const;

export const ADMIN_LINK = "/admin/login";

export const CATEGORIES = [
  {
    slug: "home-living",
    name: "Home & Living",
    description: "Comfort, kitchen, and everyday essentials.",
  },
  {
    slug: "fashion",
    name: "Fashion",
    description: "Apparel and accessories for every season.",
  },
  {
    slug: "electronics",
    name: "Electronics",
    description: "Gadgets, audio, and smart home tech.",
  },
  {
    slug: "beauty",
    name: "Beauty",
    description: "Personal care from trusted brands.",
  },
  {
    slug: "sports",
    name: "Sports",
    description: "Gear for training, outdoors, and play.",
  },
  {
    slug: "groceries",
    name: "Groceries",
    description: "Pantry staples delivered with care.",
  },
] as const;

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to high" },
  { value: "price-desc", label: "Price: High to low" },
  { value: "rating-desc", label: "Top rated" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
