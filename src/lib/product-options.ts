import type { Product, ProductOption, ProductOptionType } from "@/types/product";

type ProductOptionSource = Pick<Product, "options" | "sizes" | "inventoryBySize">;

export function getProductOptions(product: ProductOptionSource): ProductOption[] {
  const source: ProductOption[] = product.options ?? [...new Set(product.sizes ?? [])].map((value) => ({
    value,
    inventory: product.inventoryBySize?.[value] ?? 0,
  }));
  const unique = new Map<string, ProductOption>();

  for (const option of source) {
    const value = option.value.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    const existing = unique.get(key);
    if (existing) {
      existing.inventory += Math.max(0, Math.floor(option.inventory));
      existing.variantId ??= option.variantId;
    } else {
      unique.set(key, {
        value,
        inventory: Math.max(0, Math.floor(option.inventory)),
        ...(option.variantId ? { variantId: option.variantId } : {}),
      });
    }
  }

  return [...unique.values()];
}

export function getProductOptionType(product: Pick<Product, "optionType" | "options" | "sizes">): ProductOptionType {
  return product.optionType ?? (product.options?.length || product.sizes?.length ? "size" : "none");
}

export function getProductOptionTypeLabel(optionType: ProductOptionType): string {
  switch (optionType) {
    case "shoe-size": return "Shoe Size";
    case "slipper-size": return "Slipper Size";
    case "color": return "Color";
    case "other": return "Other";
    case "none": return "None";
    default: return "Size";
  }
}

export function getUniqueOptionValues(values: string[]): string[] {
  const unique = new Map<string, string>();
  for (const item of values) {
    const value = item.trim();
    if (value && !unique.has(value.toLowerCase())) unique.set(value.toLowerCase(), value);
  }
  return [...unique.values()];
}