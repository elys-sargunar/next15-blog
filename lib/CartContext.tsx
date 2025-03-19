"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { FoodItem } from "./rules";

// Extend FoodItem with MongoDB _id for runtime but as a string for serialization
export type FoodItemWithId = Omit<FoodItem, '_id'> & { 
  _id: string | { toString(): string } 
};

// Cart item structure
export type CartItem = {
  item: FoodItemWithId;
  quantity: number;
};

// Cart context type definition
type CartContextType = {
  items: CartItem[];
  addItem: (item: FoodItemWithId) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

// Create context with default values
const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
});

// Custom hook to use the cart context
export const useCart = () => useContext(CartContext);

// Provider component
export function CartProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage if available
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load cart from localStorage on component mount
  useEffect(() => {
    setMounted(true);
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Failed to parse cart data:", error);
        localStorage.removeItem("cart");
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, mounted]);

  // Add item to cart
  const addItem = (item: FoodItemWithId) => {
    setItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (cartItem) => {
          const itemId = typeof item._id === 'string' 
            ? item._id 
            : item._id.toString();
          
          const cartItemId = typeof cartItem.item._id === 'string'
            ? cartItem.item._id
            : cartItem.item._id.toString();
            
          return cartItemId === itemId;
        }
      );

      if (existingItemIndex >= 0) {
        // Item exists, update quantity
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += 1;
        return newItems;
      } else {
        // Add new item
        return [...prevItems, { item, quantity: 1 }];
      }
    });
  };

  // Remove item from cart
  const removeItem = (itemId: string) => {
    setItems((prevItems) =>
      prevItems.filter((item) => {
        const cartItemId = typeof item.item._id === 'string'
          ? item.item._id
          : item.item._id.toString();
        
        return cartItemId !== itemId;
      })
    );
  };

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        const cartItemId = typeof item.item._id === 'string'
          ? item.item._id
          : item.item._id.toString();
        
        return cartItemId === itemId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item;
      })
    );
  };

  // Clear cart
  const clearCart = () => {
    setItems([]);
  };

  // Calculate total items
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate total price
  const totalPrice = items.reduce(
    (sum, item) => sum + item.item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
} 