import { CategoryPreview } from "@/components/home/category-preview";
import { FeatureHighlights } from "@/components/home/feature-highlights";
import { Hero } from "@/components/home/hero";
import { MarketplacePreview } from "@/components/home/marketplace-preview";
import { FeaturedProducts } from "@/components/home/featured-products";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryPreview />
      <FeatureHighlights />
      <FeaturedProducts />
      <MarketplacePreview />
    </>
  );
}
