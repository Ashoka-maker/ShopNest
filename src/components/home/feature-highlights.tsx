import { Container } from "@/components/layout/container";

const highlights = [
  {
    title: "For customers",
    body: "Browse products with a mobile-first catalog. Cart and checkout will be added in later phases.",
  },
  {
    title: "For sellers",
    body: "A dedicated space is reserved so store owners can add and manage listings without mixing UI concerns.",
  },
  {
    title: "For operations",
    body: "An admin dashboard will sit on top of the same structure when marketplace controls are ready.",
  },
];

export function FeatureHighlights() {
  return (
    <Container as="section" id="about" className="py-10 sm:py-14">
      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Built to scale with the marketplace
      </h2>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl bg-white/70 p-5 ring-1 ring-border"
          >
            <h3 className="text-base font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
          </article>
        ))}
      </div>
    </Container>
  );
}
