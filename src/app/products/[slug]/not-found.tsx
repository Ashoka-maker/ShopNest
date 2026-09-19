import Link from "next/link";
import { Container } from "@/components/layout/container";
import { buttonClassName } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <Container className="py-20 text-center">
      <h1 className="font-display text-3xl font-semibold">Product not found</h1>
      <p className="mt-3 text-muted">
        That listing is not in the ShopNest sample catalog.
      </p>
      <Link href="/products" className={`${buttonClassName("primary")} mt-6`}>
        Back to shop
      </Link>
    </Container>
  );
}
