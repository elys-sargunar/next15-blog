"use client"

import { useCart } from "@/lib/CartContext";
import Link from "next/link";
import { useState, useEffect } from "react";
import { placeOrder } from "@/actions/orders";
import { getUserProfile } from "@/actions/auth";

export default function OrderPage() {
  const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  const [authUser, setAuthUser] = useState<{ userId: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Check authentication on component mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const profileResult = await getUserProfile();
        if (profileResult.success && profileResult.user) {
          setAuthUser(profileResult.user as { userId: string });
        } else {
          setAuthUser(null);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setAuthUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    }
    
    checkAuth();
  }, []);

  // Calculate the total points for items in the cart
  const totalPoints = items.reduce(
    (sum, item) => sum + ((item.item.points || 0) * item.quantity),
    0
  );

  // Handle placing an order
  const handlePlaceOrder = async () => {
    try {
      setIsSubmitting(true);
      
      if (!authUser?.userId) {
        // Must be logged in to place an order
        setOrderError("You must be logged in to place an order");
        setIsSubmitting(false);
        return;
      }

      // Convert cart items to order items for the API
      const orderItems = items.map(cartItem => {
        const item = cartItem.item;
        const itemId = typeof item._id === 'string' ? item._id : item._id.toString();
        
        return {
          id: itemId,
          name: item.name,
          price: item.price,
          points: item.points || 0,
          quantity: cartItem.quantity
        };
      });
      
      // Create form data to submit
      const formData = new FormData();
      formData.append('cartItems', JSON.stringify(orderItems));
      formData.append('totalPrice', totalPrice.toString());
      formData.append('totalPoints', totalPoints.toString());
      formData.append('email', authUser.userId); // User ID as reference for logged-in users
      
      // Call the server action with FormData
      const result = await placeOrder(formData);

      if (!result.success) {
        throw new Error(result.message || 'Failed to place order');
      }

      // Store the order ID for reference
      setOrderId(result.order._id.toString());
      
      // Since the API response no longer includes totalPoints, use the calculated value
      setEarnedPoints(totalPoints);
      
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
          {earnedPoints !== null && earnedPoints > 0 && (
            <p className="mb-6 text-amber-600 font-semibold">
              You earned {earnedPoints} reward points with this order!
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

      {isLoadingAuth ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 mb-6">Loading...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500 mb-6">Your cart is empty</p>
          <Link 
            href="/menu" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Browse Menu
          </Link>
        </div>
      ) : !authUser ? (
        <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <p className="text-xl text-yellow-700 mb-6">You must be logged in to place an order</p>
          <Link 
            href="/login?redirect=/order" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mr-4"
          >
            Login
          </Link>
          <Link 
            href="/register?redirect=/order" 
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Register
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
                    Points
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
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((cartItem) => (
                  <tr key={typeof cartItem.item._id === 'string' ? cartItem.item._id : cartItem.item._id.toString()}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cartItem.item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      £{(cartItem.item.price / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">
                      {cartItem.item.points || 0} pts × {cartItem.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => updateQuantity(typeof cartItem.item._id === 'string' ? cartItem.item._id : cartItem.item._id.toString(), Math.max(1, cartItem.quantity - 1))}
                          className="px-2 py-1 bg-gray-200 rounded-l hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 bg-gray-100">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(typeof cartItem.item._id === 'string' ? cartItem.item._id : cartItem.item._id.toString(), cartItem.quantity + 1)}
                          className="px-2 py-1 bg-gray-200 rounded-r hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                  <td colSpan={2} className="px-6 py-4 text-right font-medium">
                    Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600">
                    {totalPoints} points
                  </td>
                  <td></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    £{(totalPrice / 100).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => clearCart()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              disabled={isSubmitting}
            >
              Clear Cart
            </button>
            <button
              onClick={handlePlaceOrder}
              className={`px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Place Order'}
            </button>
          </div>
          
          {orderError && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
              {orderError}
            </div>
          )}
        </>
      )}
    </div>
  );
} 