"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

export function Carousel({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    ref.current?.scrollBy({ left: direction * Math.max(ref.current.clientWidth * 0.8, 280), behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div ref={ref} aria-label={label} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <div className="absolute -top-14 right-0 hidden gap-2 sm:flex">
        <button type="button" onClick={() => move(-1)} aria-label={`Previous ${label}`} className="shopnest-focus grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-lg text-brand hover:border-brand">←</button>
        <button type="button" onClick={() => move(1)} aria-label={`Next ${label}`} className="shopnest-focus grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-lg text-brand hover:border-brand">→</button>
      </div>
    </div>
  );
}
