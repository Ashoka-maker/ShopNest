import type { Metadata } from "next";
import { Suspense } from "react";
import { Outfit, Source_Serif_4 } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "ShopNest — Find more. Nest better.",
    template: "%s · ShopNest",
  },
  description:
    "ShopNest is a modern marketplace for everyday essentials, discovery, and trusted sellers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${sourceSerif.variable} font-sans`}>
        <CartProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Suspense fallback={null}>
                <SiteHeader />
              </Suspense>
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </AuthProvider>
        </CartProvider>
      </body>
    </html>
  );
}
