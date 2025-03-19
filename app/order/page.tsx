"use client"

import { useCart } from '@/lib/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import * as React from "react"

export default function Order() {
  const { 
    cart, 
    updateQuantity, 
    updateInstructions, 
    removeFromOrder,
    clearCart 
  } = useCart();

  const total = cart.reduce((sum, item) => 
    sum + (item.item.price * item.quantity), 0
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Order</h1>
      
      {cart.length === 0 ? (
        <div className="text-center py-8">
          <p className="mb-4">Your cart is empty</p>
          <Link href="/menu">
            <Button>Go to Menu</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {cart.map((cartItem) => (
              <div key={cartItem.item.name} className="border p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{cartItem.item.name}</h3>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => removeFromOrder(cartItem.item.name)}
                  >
                    Remove
                  </Button>
                </div>
                
                <div className="flex gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      onClick={() => updateQuantity(cartItem.item.name, cartItem.quantity - 1)}
                    >
                      -
                    </Button>
                    <span>{cartItem.quantity}</span>
                    <Button 
                      size="sm"
                      onClick={() => updateQuantity(cartItem.item.name, cartItem.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <div className="flex-1">
                    <p>Price: ${cartItem.item.price * cartItem.quantity}</p>
                  </div>
                </div>

                <Textarea
                  placeholder="Special instructions..."
                  value={cartItem.specialInstructions || ''}
                  onChange={(e) => updateInstructions(cartItem.item.name, e.target.value)}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Total:</h3>
              <p className="text-xl">${total.toFixed(2)}</p>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="destructive"
                onClick={clearCart}
              >
                Clear Cart
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  // Handle order submission
                  alert('Order submitted!');
                  clearCart();
                }}
              >
                Place Order
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 