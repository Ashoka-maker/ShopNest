import { Container } from "@/components/layout/container";

export function MarketplacePreview() {
  return (
    <Container as="section" id="sellers" className="pb-12">
      <div className="rounded-3xl border border-brand/30 bg-[linear-gradient(110deg,#251a10,#171b19)] px-5 py-8 text-white shadow-[0_0_45px_rgba(243,154,61,0.12)] sm:px-10 sm:py-12">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          ShopNest marketplace
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
          Product listings, carts, and seller tools
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
          Discover products, save your favourites, and shop with confidence from
          sellers building something special.
        </p>
      </div>
    </Container>
  );
}
