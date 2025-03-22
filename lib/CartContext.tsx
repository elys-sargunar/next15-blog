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

// Helper function to get string ID
const getStringId = (id: string | { toString(): string }): string => {
  return typeof id === 'string' ? id : id.toString();
};

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

  // Add item to cart - completely rewritten for simplicity and reliability
  const addItem = (item: FoodItemWithId) => {
    const itemId = getStringId(item._id);
    
    // Create a completely new array to ensure React detects the change
    const newItems = [...items];
    
    // Find the index of the item if it exists
    const index = newItems.findIndex(cartItem => getStringId(cartItem.item._id) === itemId);
    
    if (index >= 0) {
      // Item exists - create a new object with incremented quantity
      newItems[index] = {
        ...newItems[index],
        quantity: newItems[index].quantity + 1
      };
    } else {
      // Item doesn't exist - add new item with quantity 1
      newItems.push({
        item,
        quantity: 1
      });
    }
    
    // Set the entire new array as state
    setItems(newItems);
  };

  // Remove item from cart
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => getStringId(item.item._id) !== itemId));
  };

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    setItems(items.map(item => 
      getStringId(item.item._id) === itemId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    ));
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