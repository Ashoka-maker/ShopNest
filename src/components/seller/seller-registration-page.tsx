"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { saveSeller, generateSellerId } from "@/lib/seller-storage";

export function SellerRegistrationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    storeName: "",
    bio: "",
  });

  // Redirect if not logged in
  if (!user) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Sign in to become a seller
          </h1>
          <p className="mt-4 text-base text-muted">
            You need to sign in to register as a seller.
          </p>
          <Link
            href="/signin"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Sign In
          </Link>
        </div>
      </Container>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create seller profile
    const seller = {
      id: generateSellerId(),
      userId: user.id,
      storeName: formData.storeName.trim(),
      bio: formData.bio.trim(),
      createdAt: new Date().toISOString(),
      approvalStatus: "pending" as const,
      isActive: false,
      verificationStatus: "pending" as const,
    };

    // Save seller to localStorage
    saveSeller(seller);

    // Redirect to seller dashboard
    router.push("/seller/dashboard");
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Become a Seller
          </h1>
          <p className="mt-4 text-base text-muted">
            Set up your store and start selling on ShopNest
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="storeName" className="block text-sm font-medium mb-2">
                Store Name *
              </label>
              <input
                type="text"
                id="storeName"
                name="storeName"
                required
                value={formData.storeName}
                onChange={handleInputChange}
                className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                placeholder="My Amazing Store"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-2">
                Store Bio *
              </label>
              <textarea
                id="bio"
                name="bio"
                required
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-brand/20 resize-none"
                placeholder="Tell customers about your store and what makes it special..."
              />
            </div>

            <div className="bg-brand/5 rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-2">What happens next?</h3>
              <ul className="text-sm text-muted space-y-1">
                <li>• Your seller account will be created immediately</li>
                <li>• You can start adding products right away</li>
                <li>• Your products will be visible to all customers</li>
                <li>• Manage your inventory and orders from your dashboard</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Store..." : "Create Seller Account"}
              </Button>
              <Link
                href="/products"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have a seller account?{" "}
          <Link href="/seller/dashboard" className="font-semibold text-brand hover:text-brand-dark">
            Go to Dashboard
          </Link>
        </p>
      </div>
    </Container>
  );
}
