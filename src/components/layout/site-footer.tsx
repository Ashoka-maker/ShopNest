import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-white/50">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Link href="/" aria-label="ShopNest home">
            <Logo />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            A clean marketplace for customers, sellers, and the products that
            belong in every nest.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/products" className="hover:text-foreground">
                Browse products
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:text-foreground">
                Categories
              </Link>
            </li>
            <li>
              <Link
                href="/products?sort=rating-desc"
                className="hover:text-foreground"
              >
                Top rated
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Sell</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Open a store</li>
            <li>Seller tools</li>
            <li>Support</li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{`© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.`}</p>
          <p>Catalog is live — checkout and accounts come later.</p>
        </Container>
      </div>
    </footer>
  );
}
