"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Cart, CartItem } from "@/types/cart";
import type { ProductSize } from "@/types/product";

type CartContextType = {
  cart: Cart;
  addToCart: (productId: string, quantity?: number, size?: ProductSize) => void;
  removeFromCart: (productId: string, size?: ProductSize) => void;
  updateQuantity: (productId: string, quantity: number, size?: ProductSize) => void;
  clearCart: () => void;
  getCartCount: () => number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [] });

  const addToCart = (productId: string, quantity = 1, size?: ProductSize) => {
    setCart((prevCart) => {
      const existingItem = prevCart.items.find(
        (item) => item.productId === productId && item.size === size
      );

      if (existingItem) {
        return {
          items: prevCart.items.map((item) =>
            item.productId === productId && item.size === size
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      }

      return {
        items: [...prevCart.items, { productId, quantity, ...(size ? { size } : {}) }],
      };
    });
  };

  const removeFromCart = (productId: string, size?: ProductSize) => {
    setCart((prevCart) => ({
      items: prevCart.items.filter(
        (item) => !(item.productId === productId && (size === undefined || item.size === size)),
      ),
    }));
  };

  const updateQuantity = (productId: string, quantity: number, size?: ProductSize) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    setCart((prevCart) => ({
      items: prevCart.items.map((item) =>
        item.productId === productId && item.size === size ? { ...item, quantity } : item
      ),
    }));
  };

  const clearCart = () => {
    setCart({ items: [] });
  };

  const getCartCount = () => {
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
