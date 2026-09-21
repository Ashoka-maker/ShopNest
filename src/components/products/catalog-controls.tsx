"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, SORT_OPTIONS } from "@/lib/constants";
import { catalogHref, getCategoryBySlug, parseAvailability, parsePrice } from "@/features/products/query";
import { cn } from "@/lib/utils";
import type { CatalogQuery } from "@/features/products/query";

type CatalogControlsProps = {
  query: CatalogQuery;
  resultCount: number;
};

export function CatalogControls({ query, resultCount }: CatalogControlsProps) {
  const router = useRouter();
  const selectedCategory = getCategoryBySlug(query.category);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">The ShopNest edit</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {selectedCategory ? `Shop ${selectedCategory.name}` : "Shop products"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {selectedCategory ? `${selectedCategory.description} ` : null}
            {resultCount} {resultCount === 1 ? "item" : "items"}
            {query.q?.trim() ? ` for “${query.q.trim()}”` : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <SelectFilter label="Price" value={parsePrice(query.price)} options={[
            ["all", "Any price"], ["under-1000", "Under ₹1,000"], ["1000-5000", "₹1,000–₹5,000"], ["over-5000", "Over ₹5,000"],
          ]} onChange={(value) => router.push(catalogHref({ ...query, price: value }))} />
          <SelectFilter label="Availability" value={parseAvailability(query.availability)} options={[
            ["all", "All stock"], ["in-stock", "In stock"], ["out-of-stock", "Out of stock"],
          ]} onChange={(value) => router.push(catalogHref({ ...query, availability: value }))} />
          <SelectFilter label="Sort" value={query.sort ?? "featured"} options={SORT_OPTIONS.map((option) => [option.value, option.label])} onChange={(value) => router.push(catalogHref({ ...query, sort: value }))} />
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <FilterChip
          href={catalogHref({ ...query, category: undefined })}
          active={!query.category}
        >
          All
        </FilterChip>
        {CATEGORIES.map((category) => (
          <FilterChip
            key={category.slug}
            href={catalogHref({ ...query, category: category.slug })}
            active={query.category === category.slug}
          >
            {category.name}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        className="h-11 rounded-full border border-border bg-surface px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition",
        active
          ? "border-brand bg-brand text-white"
          : "border-border bg-surface text-foreground hover:border-brand/40",
      )}
    >
      {children}
    </Link>
  );
}
