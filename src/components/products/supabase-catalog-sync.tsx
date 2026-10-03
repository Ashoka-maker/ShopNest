"use client";

import { useEffect } from "react";
import { loadSupabaseProducts } from "@/features/products/data";

export function SupabaseCatalogSync() {
  useEffect(() => {
    void loadSupabaseProducts().catch((error: unknown) => {
      console.error("Unable to preload the public product catalog:", error);
    });
  }, []);

  return null;
}
