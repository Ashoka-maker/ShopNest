import type { ProductOptionValue } from "./product";

export type CartItem = {
  productId: string;
  quantity: number;
  size?: ProductOptionValue;
  variantId?: string;
};

export type Cart = {
  items: CartItem[];
};
