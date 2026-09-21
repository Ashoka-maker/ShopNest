"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES } from "@/lib/constants";
import { Container } from "@/components/layout/container";

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const slides = CATEGORIES.slice(0, 4);
  const slide = slides[active];
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_78%_25%,rgba(243,154,61,0.2),transparent_32%),linear-gradient(115deg,#0b0d0c,#20170f)]">
      <Container className="grid min-h-[25rem] items-center gap-8 py-12 sm:min-h-[29rem] sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div key={slide.slug} className="shopnest-rise">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">ShopNest collection</p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Find more.<span className="block text-brand">Nest better.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">{slide.description}</p>
          <Link href={`/products?category=${slide.slug}`} className="mt-7 inline-flex h-12 items-center rounded-full bg-brand px-6 text-sm font-bold text-black shadow-lg shadow-brand/20 hover:-translate-y-0.5 hover:bg-accent">Explore {slide.name}</Link>
        </div>
        <div className="hidden h-64 rounded-[2rem] border border-brand/20 bg-[radial-gradient(circle_at_50%_30%,rgba(243,154,61,0.28),transparent_42%),#151817] shadow-[0_0_60px_rgba(243,154,61,0.1)] sm:block" aria-hidden />
      </Container>
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Hero slides">
        {slides.map((item, index) => <button key={item.slug} type="button" aria-label={`Show ${item.name}`} aria-current={index === active} onClick={() => setActive(index)} className={`h-2 rounded-full transition ${index === active ? "w-8 bg-brand" : "w-2 bg-white/40 hover:bg-white/70"}`} />)}
      </div>
    </section>
  );
}
