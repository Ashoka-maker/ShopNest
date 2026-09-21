import Link from "next/link";
import { getSellerById } from "@/lib/seller-storage";

export function SellerBadge({ sellerId, sellerName }: { sellerId: string; sellerName: string }) {
  const seller = getSellerById(sellerId);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link href={`/sellers/${sellerId}`} className="font-medium text-brand hover:text-brand-dark">
        {sellerName}
      </Link>
      {seller?.verificationStatus === "verified" ? (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          Verified Seller
        </span>
      ) : null}
    </span>
  );
}
