"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/products/product-card";
import { getAvailableInventoryById } from "@/lib/inventory-storage";
import { StarRating } from "@/components/products/star-rating";
import { ProductActions } from "@/components/products/product-actions";
import { Container } from "@/components/layout/container";
import { getProductBySlug, getRelatedProducts } from "@/features/products/data";
import { CATEGORIES } from "@/lib/constants";
import { discountPercent, formatCents } from "@/lib/money";
import { getReviewSummary, REVIEWS_UPDATED_EVENT } from "@/lib/review-storage";
import { ProductReviews } from "@/components/products/product-reviews";
import { WishlistButton } from "@/components/products/wishlist-button";
import { SellerBadge } from "@/components/seller/seller-badge";

export default function ProductDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = getProductBySlug(slug);
  const [reviewSummary, setReviewSummary] = useState(() => product ? getReviewSummary(product.id) : { rating: 0, reviewCount: 0 });

  useEffect(() => {
    if (product) document.title = `${product.name} · ShopNest`;
  }, [product]);
  useEffect(() => {
    if (!product) return;
    const refresh = () => setReviewSummary(getReviewSummary(product.id));
    window.addEventListener(REVIEWS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, refresh);
  }, [product]);

  if (!product) {
    return (
      <Container className="py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Product not found</h1>
        <Link href="/products" className="mt-6 inline-flex text-brand hover:text-brand-dark">
          Back to shop
        </Link>
      </Container>
    );
  }

  const category = CATEGORIES.find((item) => item.slug === product.category);
  const off = discountPercent(product.priceCents, product.compareAtPriceCents);
  const related = getRelatedProducts(product);
  const gallery = [product.imageUrl, ...product.gallery];

  return (
    <Container className="py-8 sm:py-12">
      <nav className="text-xs font-medium text-muted">
        <Link href="/products" className="hover:text-foreground">
          Shop
        </Link>
        <span className="mx-2">/</span>
        {category ? (
          <Link
            href={`/products?category=${category.slug}`}
            className="hover:text-foreground"
          >
            {category.name}
          </Link>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="grid gap-3">
          {gallery.map((src, index) => (
            <div
              key={src}
              className={`relative overflow-hidden rounded-3xl bg-[#efe8dc] ${
                index === 0 ? "aspect-[4/3]" : "aspect-[16/9] hidden sm:block"
              }`}
            >
              <Image
                src={src}
                alt={`${product.name}${index > 0 ? ` view ${index + 1}` : ""}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">{category?.name}</p>
          <div className="mt-2 text-sm"><SellerBadge sellerId={product.sellerId} sellerName={product.sellerName} /> · <Link href={`/sellers/${product.sellerId}`} className="text-brand hover:text-brand-dark">View Seller Store</Link></div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <WishlistButton productId={product.id} />
          </div>
          <div className="mt-3">
            <StarRating
              rating={reviewSummary.reviewCount ? reviewSummary.rating : product.rating}
              reviewCount={reviewSummary.reviewCount || product.reviewCount}
              size="md"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold tracking-tight">
              {formatCents(product.priceCents)}
            </span>
            {off > 0 && product.compareAtPriceCents ? (
              <>
                <span className="text-lg text-muted line-through">
                  {formatCents(product.compareAtPriceCents)}
                </span>
                <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent">
                  Save {off}%
                </span>
              </>
            ) : null}
          </div>

          <p className="mt-5 text-base leading-7 text-muted">
            {product.description}
          </p>

          <ul className="mt-6 space-y-2 text-sm">
            {product.highlights.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 rounded-xl bg-brand/5 px-4 py-3 text-sm font-medium text-brand">
            {getAvailableInventoryById(product.id, product.inventory) > 0
              ? `${getAvailableInventoryById(product.id, product.inventory)} in stock`
              : "Out of stock"}
            {" · Sample catalog (checkout later)"}
          </p>

          <ProductActions
            productId={product.id}
            categorySlug={product.category}
            categoryName={category?.name || ""}
            inventory={getAvailableInventoryById(product.id, product.inventory)}
            sizes={product.sizes}
          />
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Related in {category?.name}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
      <ProductReviews productId={product.id} />
    </Container>
  );
}
