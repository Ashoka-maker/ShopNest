import { ProductFormPage } from "@/components/seller/product-form-page";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProductFormPage mode="edit" params={params} />;
}
