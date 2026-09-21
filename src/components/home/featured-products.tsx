import Link from "next/link";
import { Carousel } from "@/components/ui/carousel";
import { ProductCard } from "@/components/products/product-card";
import { Container } from "@/components/layout/container";
import { getAllProducts } from "@/features/products/data";

export function FeaturedProducts() {
  const products = getAllProducts().slice(0, 8);
  if (!products.length) return null;
  return (
    <Container as="section" className="py-10 sm:py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Curated for you</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Featured products</h2></div>
        <Link href="/products" className="text-sm font-semibold text-brand hover:text-accent">View all</Link>
      </div>
      <Carousel label="featured products">
        {products.map((product) => <div key={product.id} className="w-[78vw] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]"><ProductCard product={product} /></div>)}
      </Carousel>
    </Container>
  );
}
