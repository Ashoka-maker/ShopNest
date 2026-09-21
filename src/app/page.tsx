import { CategoryPreview } from "@/components/home/category-preview";
import { FeatureHighlights } from "@/components/home/feature-highlights";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { MarketplaceDiscovery } from "@/components/home/marketplace-discovery";

export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <CategoryPreview />
      <FeatureHighlights />
      <MarketplaceDiscovery />
    </>
  );
}
