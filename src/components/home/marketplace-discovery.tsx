"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Carousel } from "@/components/ui/carousel";
import { ProductSection } from "@/components/home/product-section";
import { CATEGORIES } from "@/lib/constants";
import { getAllProducts } from "@/features/products/data";
import { getAllSellers, getSellerProducts } from "@/lib/seller-storage";
import type { Product } from "@/types/product";

export function MarketplaceDiscovery() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    const load = () => setProducts(getAllProducts());
    load();
    window.addEventListener("storage", load);
    window.addEventListener("shopnest:product-catalog-updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("shopnest:product-catalog-updated", load);
    };
  }, []);
  const discounted = products.filter((item) => item.compareAtPriceCents && item.compareAtPriceCents > item.priceCents).slice(0, 8);
  const popular = [...products].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount).slice(0, 8);
  const sellers = getAllSellers();
  return <>
    <Container as="section" className="py-10 sm:py-14">
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Browse the edit</p><h2 className="mt-2 font-display text-3xl font-semibold">Shop by category</h2></div>
      <Carousel label="Shop by category">{CATEGORIES.map((category) => <Link key={category.slug} href={`/products?category=${category.slug}`} className="w-56 shrink-0 snap-start rounded-3xl border border-border bg-surface p-6 shadow-sm hover:-translate-y-1 hover:border-brand/60"><span className="text-3xl" aria-hidden>✦</span><h3 className="mt-6 font-semibold">{category.name}</h3><p className="mt-2 text-sm leading-6 text-muted">{category.description}</p></Link>)}</Carousel>
    </Container>
    <ProductSection eyebrow="Deals from the live catalog" title="Deal of the Day" products={discounted} tone="dark" />
    <ProductSection eyebrow="Popular with shoppers" title="Trending Now" products={popular} />
    <Container as="section" className="py-10 sm:py-14">
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Find your fit</p><h2 className="mt-2 font-display text-3xl font-semibold">Shop by price</h2></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Under ₹299","under-1000"],["₹299–₹599","1000-5000"],["₹599–₹999","1000-5000"],["₹999–₹1,999","1000-5000"],["₹2,000+","over-5000"]].map(([label, value]) => <Link key={label} href={`/products?price=${value}`} className="rounded-2xl border border-border bg-surface p-5 text-center font-semibold hover:border-brand hover:bg-brand hover:text-black">{label}</Link>)}</div>
    </Container>
    {sellers.length ? <Container as="section" className="py-10 sm:py-14"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Independent makers</p><h2 className="mt-2 font-display text-3xl font-semibold">Featured sellers</h2></div><Carousel label="Featured sellers">{sellers.map((seller) => <Link key={seller.id} href={`/sellers/${seller.id}`} className="w-64 shrink-0 snap-start rounded-3xl border border-border bg-surface p-6 hover:-translate-y-1 hover:border-brand/60"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-xl font-bold text-black">{seller.storeName.charAt(0).toUpperCase()}</div><h3 className="mt-5 font-semibold">{seller.storeName}</h3><p className="mt-2 line-clamp-2 text-sm text-muted">{seller.bio}</p><p className="mt-4 text-sm font-semibold text-brand">{getSellerProducts(seller.id).length} active products</p></Link>)}</Carousel></Container> : null}
    <ProductSection eyebrow="Keep exploring" title="New Products" products={products.slice(-8)} />
  </>;
}
