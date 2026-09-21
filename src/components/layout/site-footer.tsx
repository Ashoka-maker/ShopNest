import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-[#10251c] text-white">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Link href="/" aria-label="ShopNest home">
            <Logo />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
            A considered marketplace for discovering useful products from
            trusted independent sellers.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Shop</p>
          <ul className="mt-4 space-y-3 text-sm text-white/65">
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
            <li><Link href="/seller/signup" className="hover:text-white">Open a store</Link></li>
            <li><Link href="/support" className="hover:text-white">Seller tools</Link></li>
            <li><Link href="/support" className="hover:text-white">Support</Link></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 border-white/10 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{`© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.`}</p>
          <p>Made for better everyday shopping.</p>
        </Container>
      </div>
    </footer>
  );
}
