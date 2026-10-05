"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { useAuth } from "@/lib/auth-context";
import { saveSeller, generateSellerId, updateSeller } from "@/lib/seller-storage";
import { getDataSourceMode } from "@/lib/adapters/config";
import { ensureSellerInSupabase } from "@/lib/supabase/product-repository";

export function SellerSignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    storeName: "",
    bio: "",
    contactPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Sign up as seller
      const result = await signUp(formData.name, formData.email, formData.password, "seller", {
        storeName: formData.storeName,
        bio: formData.bio,
        contactName: formData.name,
        contactEmail: formData.email,
        contactPhone: formData.contactPhone,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
      });
      
      if (!result.success) {
        setError(result.error || "Failed to create account");
        setIsSubmitting(false);
        return;
      }

      // Create seller profile
      if (result.userId) {
        const seller = {
          id: generateSellerId(),
          userId: result.userId,
          storeName: formData.storeName.trim(),
          bio: formData.bio.trim(),
          contactName: formData.name.trim(),
          contactEmail: formData.email.trim(),
          contactPhone: formData.contactPhone.trim(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim(),
          createdAt: new Date().toISOString(),
          approvalStatus: "pending" as const,
          isActive: false,
          verificationStatus: "pending" as const,
        };

        // Save seller to localStorage
        saveSeller(seller);

        if (getDataSourceMode() === "supabase" || getDataSourceMode() === "hybrid") {
          const supabaseSellerId = await ensureSellerInSupabase(result.userId, seller.storeName, seller.bio, {
            contactName: seller.contactName,
            contactEmail: seller.contactEmail,
            contactPhone: seller.contactPhone,
            addressLine1: seller.addressLine1,
            addressLine2: seller.addressLine2,
            city: seller.city,
            state: seller.state,
            postalCode: seller.postalCode,
            country: seller.country,
          });
          updateSeller(result.userId, { supabaseSellerId });
        }
      }

      // Redirect to seller dashboard
      router.push("/seller/dashboard");
    } catch (err) {
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Become a Seller
          </h1>
          <p className="mt-4 text-base text-muted">
            Create your seller account and start selling on ShopNest
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Account Information */}
            <div>
              <h3 className="font-semibold text-sm mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-11 rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Must be at least 6 characters
                  </p>
                </div>
              </div>
            </div>

            {/* Store Information */}
            <div>
              <h3 className="font-semibold text-sm mb-4">Store Information</h3>
              <div className="space-y-4">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">Contact phone *
                    <input type="tel" name="contactPhone" required value={formData.contactPhone} onChange={handleInputChange} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20" />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">Address line 1 (optional)
                    <input name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20" />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">Address line 2 (optional)
                    <input name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20" />
                  </label>
                  <label className="text-sm font-medium">City (optional)
                    <input name="city" value={formData.city} onChange={handleInputChange} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20" />
                  </label>
                  <label className="text-sm font-medium">State / region (optional)
                    <input name="state" value={formData.state} onChange={handleInputChange} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20" />
                  </label>
                  <label className="text-sm font-medium">Postal code (optional)
                    <input name="postalCode" value={formData.postalCode} onChange={handleInputChange} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20" />
                  </label>
                  <label className="text-sm font-medium">Country (optional)
                    <input name="country" value={formData.country} onChange={handleInputChange} className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-brand/20" />
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-brand/5 rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-2">What happens next?</h3>
              <ul className="text-sm text-muted space-y-1">
                <li>• Your seller account will be created immediately</li>
                <li>• You can start adding products right away</li>
                <li>• Your products will be visible to customers after approval</li>
                <li>• Manage your inventory and orders from your dashboard</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Account..." : "Create Seller Account"}
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
          <Link href="/signin" className="font-semibold text-brand hover:text-brand-dark">
            Sign In
          </Link>
        </p>
      </div>
    </Container>
  );
}
