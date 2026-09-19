import type { ProductSize } from "./product";

export type CartItem = {
  productId: string;
  quantity: number;
  size?: ProductSize;
};

export type Cart = {
  items: CartItem[];
};
