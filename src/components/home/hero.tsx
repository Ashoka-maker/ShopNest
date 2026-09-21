import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export function Hero() {
  return (
    <section className="overflow-hidden bg-[radial-gradient(circle_at_85%_10%,rgba(243,154,61,0.16),transparent_35%),linear-gradient(180deg,#171b19_0%,#0b0d0c_100%)]">
      <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div>
          <p className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-bold tracking-[0.18em] text-brand uppercase">
            Curated marketplace
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Find more.
            <span className="block text-brand">Nest better.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
            Discover thoughtful products from trusted sellers, with a calmer
            way to browse, compare, and shop for everyday life.
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
          <div className="shopnest-shadow rounded-[2rem] border border-border bg-surface/90 p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Explore ShopNest</p>
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">Fresh finds</span>
            </div>
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
                  className={`rounded-2xl ${card.tone} px-4 py-8 text-sm font-semibold shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
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
