import Link from "next/link";
import { Carousel } from "@/components/ui/carousel";
import { ProductCard } from "@/components/products/product-card";
import { Container } from "@/components/layout/container";
import type { Product } from "@/types/product";

export function ProductSection({
  eyebrow,
  title,
  products,
  href = "/products",
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  products: Product[];
  href?: string;
  tone?: "default" | "dark";
}) {
  if (!products.length) return null;
  return (
    <Container as="section" className={`py-10 sm:py-14 ${tone === "dark" ? "max-w-none bg-[#121615] px-4 sm:px-6 lg:px-8" : ""}`}>
      <div className="mx-auto mb-6 flex max-w-6xl items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h2></div>
        <Link href={href} className="text-sm font-semibold text-brand hover:text-accent">View all</Link>
      </div>
      <div className="mx-auto max-w-6xl"><Carousel label={title}>{products.map((product) => <div key={product.id} className="w-[78vw] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]"><ProductCard product={product} /></div>)}</Carousel></div>
    </Container>
  );
}
