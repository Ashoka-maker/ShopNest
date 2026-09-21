import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";
import { Container } from "@/components/layout/container";

export function CategoryPreview() {
  return (
    <Container as="section" id="categories" className="py-6 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Shop by category
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
            Jump into a department or browse the full catalog.
          </p>
        </div>
        <Link
          href="/products"
          className="hidden text-sm font-semibold text-brand hover:text-brand-dark sm:inline"
        >
          View all
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/products?category=${category.slug}`}
            className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-md"
          >
            <h3 className="text-base font-semibold transition group-hover:text-brand">{category.name}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              {category.description}
            </p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
