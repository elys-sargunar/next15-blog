"use client"

import { useCart } from "@/lib/CartContext";
import Link from "next/link";
import { useState } from "react";

export default function OrderPage() {
  const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    setIsSubmitting(true);
    setOrderError(null);

    try {
      // Prepare order data
      const orderData = {
        items: items.map(item => ({
          id: typeof item.item._id === 'string' ? item.item._id : item.item._id.toString(),
          name: item.item.name,
          price: item.item.price,
          quantity: item.quantity
        })),
        totalPrice,
        customerInfo: {
          // In a real app, you might collect this from a form
          name: "Guest User",
          email: "",
          address: ""
        }
      };

      // Submit order to API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place order');
      }

      // Store the order ID for reference
      setOrderId(result.orderId);
      
      // Clear the cart
      clearCart();
      
      // Show success message
      setOrderPlaced(true);
    } catch (error) {
      console.error("Failed to place order:", error);
      setOrderError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-green-800 mb-4">Order Placed Successfully!</h1>
          <p className="mb-6 text-green-700">
            Thank you for your order. Your delicious food will be prepared shortly.
          </p>
          {orderId && (
            <p className="mb-6 text-green-700">
              Order ID: <span className="font-semibold">{orderId}</span>
            </p>
          )}
          <Link 
            href="/menu" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Your Order</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 mb-6">Your cart is empty</p>
          <Link 
            href="/menu" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white overflow-hidden mb-8">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((cartItem) => (
                  <tr key={typeof cartItem.item._id === 'string' ? cartItem.item._id : cartItem.item._id.toString()}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {cartItem.item.name}
                          </div>
                          {cartItem.item.description && (
                            <div className="text-sm text-gray-500">
                              {cartItem.item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      £{(cartItem.item.price / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => updateQuantity(
                            typeof cartItem.item._id === 'string' ? cartItem.item._id : cartItem.item._id.toString(), 
                            cartItem.quantity - 1
                          )}
                          disabled={cartItem.quantity <= 1}
                          className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="mx-2 text-sm">{cartItem.quantity}</span>
                        <button
                          onClick={() => updateQuantity(
                            typeof cartItem.item._id === 'string' ? cartItem.item._id : cartItem.item._id.toString(), 
                            cartItem.quantity + 1
                          )}
                          className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      £{((cartItem.item.price * cartItem.quantity) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => removeItem(typeof cartItem.item._id === 'string' ? cartItem.item._id : cartItem.item._id.toString())}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right font-medium">
                    Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    £{(totalPrice / 100).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {orderError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {orderError}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={clearCart}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Clear Cart
            </button>
            
            <div className="flex space-x-4">
              <Link
                href="/menu"
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Continue Shopping
              </Link>
              
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-lg text-white transition ${
                  isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 