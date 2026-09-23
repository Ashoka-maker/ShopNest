"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

const CART_STORAGE_KEY = "shopnest_cart";

// Helper functions for localStorage
const getStoredCart = (): Cart => {
  if (typeof window === "undefined") return { items: [] };
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { items: [] };
  } catch {
    return { items: [] };
  }
};

const saveStoredCart = (cart: Cart) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error("Failed to save cart:", e);
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [cart, setCart] = useState<Cart>(() => {
    // Initialize with stored cart immediately to avoid race condition
    if (typeof window !== "undefined") {
      return getStoredCart();
    }
    return { items: [] };
  });

  // Mark as hydrated after initial mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes (but only after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveStoredCart(cart);
    }
  }, [cart, isHydrated]);

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
    setCart((prevCart) => {
      const updatedCart = {
        items: prevCart.items.filter(
          (item) => !(item.productId === productId && (size === undefined || item.size === size)),
        ),
      };
      return updatedCart;
    });
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
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
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
