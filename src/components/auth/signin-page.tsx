"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { AuthButton } from "./auth-button";

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const result = await signIn(email, password);
    if (result.success) {
      router.push(result.role === "seller" ? "/seller/dashboard" : "/");
    } else {
      setError(result.error || "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Container>
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block">
              <Logo />
            </Link>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold">Sign in</h1>

            {error && (
              <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <AuthButton
                type="submit"
                isLoading={isLoading}
                loadingText="Signing in..."
              >
                Sign in
              </AuthButton>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                New to ShopNest?{" "}
                <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
                  Create your account
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>
              By continuing, you agree to ShopNest's{" "}
              <Link href="#" className="text-blue-600 hover:underline">
                Conditions of Use
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-blue-600 hover:underline">
                Privacy Notice
              </Link>
              .
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
