import { OrderConfirmationPage } from "@/components/checkout/order-confirmation-page";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <OrderConfirmationPage searchParams={searchParams} />;
}
