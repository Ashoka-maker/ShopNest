import { Container } from "@/components/layout/container";

export function MarketplacePreview() {
  return (
    <Container as="section" id="sellers" className="pb-12">
      <div className="rounded-3xl bg-brand px-5 py-8 text-white sm:px-10 sm:py-12">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
          Coming next
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
          Product listings, carts, and seller tools
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
          This foundation keeps the homepage, layout, and domain folders ready.
          No mock APIs or fake checkout flows are wired in yet.
        </p>
      </div>
    </Container>
  );
}
