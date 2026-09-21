import { SellerStorePage } from "@/components/seller/seller-store-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerStorePage sellerId={id} />;
}
