"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { SearchForm } from "@/components/products/search-form";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cart } = useCart();
  const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);
  const { user, signOut, isSeller, isAdmin } = useAuth();

  return (
    <header className="shopnest-glass sticky top-0 z-40 border-b border-border/80 shadow-[0_4px_20px_rgba(20,54,40,0.04)]">
      <Container className="flex h-[4.5rem] items-center gap-3 sm:h-20">
        <Link href="/" className="shrink-0" aria-label="ShopNest home">
          <Logo />
        </Link>

        <HeaderSearch className="hidden min-w-0 flex-1 md:block" id="site-search" />

        <nav className="ml-auto hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-semibold text-muted transition hover:bg-ink-soft hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium">Hello, {user.name}</span>
              <NotificationBell />
              {isAdmin && (
                <Link 
                  href="/admin/dashboard"
                  className="text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Admin
                </Link>
              )}
              {isSeller && (
                <Link 
                  href="/seller/dashboard"
                  className="text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Seller Dashboard
                </Link>
              )}
              {!isSeller && !isAdmin && (
                <>
                  <Link href="/orders" className="text-sm font-medium text-brand hover:text-brand-dark">My Orders</Link>
                  <Link href="/wishlist" className="text-sm font-medium text-brand hover:text-brand-dark">Wishlist</Link>
                  <Link href="/account" className="text-sm font-medium text-brand hover:text-brand-dark">Account</Link>
                </>
              )}
              <Button 
                variant="ghost" 
                onClick={signOut}
                className="text-sm"
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Link href="/signin">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Sign in
              </Button>
            </Link>
          )}
          <Link 
            href="/cart" 
            className="shopnest-focus relative inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand"
            aria-label="Cart"
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="shopnest-focus inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface shadow-sm lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">Toggle menu</span>
            <span aria-hidden className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-4 bg-foreground" />
              <span className="block h-0.5 w-4 bg-foreground" />
              <span className="block h-0.5 w-3 bg-foreground" />
            </span>
          </button>
        </div>
      </Container>

      {menuOpen ? (
        <div id="mobile-nav" className="border-t border-border bg-background lg:hidden">
          <Container className="space-y-3 py-4">
            <HeaderSearch
              id="mobile-search"
              placeholder="Search ShopNest"
              onSearch={() => setMenuOpen(false)}
            />
            <nav className="grid gap-1" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <div className="rounded-xl px-3 py-2.5 text-sm font-medium">
                    Hello, {user.name}
                  </div>
                  <NotificationBell />
                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {isSeller && (
                    <Link
                      href="/seller/dashboard"
                      className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white"
                      onClick={() => setMenuOpen(false)}
                    >
                      Seller Dashboard
                    </Link>
                  )}
                  {!isSeller && !isAdmin && (
                    <>
                      <Link href="/orders" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white" onClick={() => setMenuOpen(false)}>My Orders</Link>
                      <Link href="/wishlist" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white" onClick={() => setMenuOpen(false)}>My Wishlist</Link>
                      <Link href="/account" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white" onClick={() => setMenuOpen(false)}>Account Settings</Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white text-left"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/signin"
                  className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
              )}
              <Link
                href="/cart"
                className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white flex items-center justify-between"
                onClick={() => setMenuOpen(false)}
              >
                Cart
                {cartCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}

function HeaderSearch({
  id,
  className,
  placeholder,
  onSearch,
}: {
  id: string;
  className?: string;
  placeholder?: string;
  onSearch?: () => void;
}) {
  const searchParams = useSearchParams();

  return (
    <SearchForm
      id={id}
      className={className}
      placeholder={placeholder}
      defaultQuery={searchParams.get("q") ?? ""}
      compact
      onSubmit={onSearch}
    />
  );
}
