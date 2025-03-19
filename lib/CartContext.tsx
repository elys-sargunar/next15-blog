"use client"

import { createContext, useContext, useState } from 'react';
import { FoodItem } from '@/lib/rules';

export interface CartItem {
  item: FoodItem;
  quantity: number;
  specialInstructions?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToOrder: (item: FoodItem) => void;
  updateQuantity: (itemName: string, newQuantity: number) => void;
  updateInstructions: (itemName: string, instructions: string) => void;
  removeFromOrder: (itemName: string) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToOrder = (item: FoodItem) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (cartItem) => cartItem.item.name === item.name
      );
      
      if(existingItemIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      } else {
        return [...prevCart, { item, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (itemName: string, newQuantity: number) => {
    setCart((prevCart) => {
      if (newQuantity <= 0) {
        return prevCart.filter(item => item.item.name !== itemName);
      }
      return prevCart.map(item =>
        item.item.name === itemName ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const updateInstructions = (itemName: string, instructions: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.item.name === itemName ? { ...item, specialInstructions: instructions } : item
      )
    );
  };

  const removeFromOrder = (itemName: string) => {
    setCart(prevCart => prevCart.filter(item => item.item.name !== itemName));
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => 
    sum + (item.item.price * item.quantity), 0
  );

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToOrder, 
      updateQuantity, 
      updateInstructions, 
      removeFromOrder,
      clearCart,
      total
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 