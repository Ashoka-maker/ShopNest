import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export function Hero() {
  return (
    <section className="overflow-hidden">
      <Container className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Marketplace
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Find more.
            <span className="block text-brand">Nest better.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
            ShopNest is a professional marketplace for browsing products from
            trusted sellers — designed to grow into carts, orders, and store
            management.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={`${buttonClassName("primary")} w-full sm:w-auto`}>
              Start browsing
            </Link>
            <Link
              href="/seller/signup"
              className={`${buttonClassName("secondary")} w-full sm:w-auto`}
            >
              Become a seller
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <p className="text-sm font-medium text-muted">Today on ShopNest</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Home finds", tone: "bg-[#eef6f1]", href: "/products?category=home-living" },
                { label: "New arrivals", tone: "bg-[#f8efe4]", href: "/products?sort=rating-desc" },
                { label: "Top sellers", tone: "bg-[#f4f0e8]", href: "/products?sort=rating-desc" },
                { label: "Start selling", tone: "bg-[#eaf1ee]", href: "/seller/signup" },
              ].map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`rounded-2xl ${card.tone} px-4 py-8 text-sm font-semibold transition hover:brightness-[0.98]`}
                >
                  {card.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
