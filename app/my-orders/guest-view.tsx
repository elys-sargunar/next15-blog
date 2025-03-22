"use client"

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Define Order type
type Order = {
  _id: string;
  createdAt: string;
  items: Array<OrderItem>;
  totalPrice: number;
  totalPoints: number;
  status: string;
};

// Define order item type
type OrderItem = {
  name: string;
  price: number;
  quantity: number;
};

export default function GuestOrdersView() {
  const [orderId, setOrderId] = useState("");
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updatedStatus, setUpdatedStatus] = useState<boolean>(false);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Listen for order status updates via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !orderData) return;
    
    // Create broadcast channel to listen for status updates
    const channel = new BroadcastChannel('order-status-updates');
    broadcastChannelRef.current = channel;
    
    // Listen for status updates
    const handleStatusUpdate = (event: MessageEvent) => {
      if (event.data && event.data.type === 'status-update') {
        const { orderId: updatedOrderId, newStatus } = event.data;
        
        // Check if this update is for the current order
        if (orderData && orderData._id === updatedOrderId) {
          // Update the order data with the new status
          setOrderData((prevData: Order | null) => {
            if (!prevData) return null;
            return {
              ...prevData,
              status: newStatus
            };
          });
          
          // Set highlight effect
          setUpdatedStatus(true);
          
          // Clear existing timeout if there is one
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }
          
          // Remove highlight after 3 seconds
          highlightTimeoutRef.current = setTimeout(() => {
            setUpdatedStatus(false);
            highlightTimeoutRef.current = null;
          }, 3000);
        }
      }
    };
    
    channel.addEventListener('message', handleStatusUpdate);
    
    // Cleanup on unmount or when order changes
    return () => {
      channel.removeEventListener('message', handleStatusUpdate);
      channel.close();
      broadcastChannelRef.current = null;
      
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [orderData]);

  const handleOrderLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error("Order not found");
      }
      
      const data = await response.json();
      setOrderData(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find order");
      setOrderData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      
      {/* Guest Information Section */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-md text-white">
        <h2 className="text-xl font-semibold mb-4">Order Lookup</h2>
        <p className="mb-4">Not logged in? Enter your order ID to track your order:</p>
        
        <form onSubmit={handleOrderLookup} className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID"
            className="flex-grow p-2 border rounded"
          />
          <button
            type="submit"
            disabled={isLoading}
            className={` btn-primary px-6 py-2 rounded-lg text-white transition ${
              isLoading ? "bg-green-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <span>{isLoading ? "Looking up..." : "Search"}</span>
          </button>
        </form>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      {/* Order Section */}
      {orderData && (
        <div className={`bg-slate-800 p-6 rounded-lg shadow-md text-white transition-all duration-300 
          ${updatedStatus ? 'ring-2 ring-yellow-400' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          
          <div className="mb-6">
            <p className="text-white-600"><span className="font-medium">Order ID:</span> {orderData._id}</p>
            <p className="text-white-600"><span className="font-medium">Date:</span> {new Date(orderData.createdAt).toLocaleString()}</p>
            <p className="text-white-600">
              <span className="font-medium">Status:</span> 
              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                ${orderData.status === "completed" ? "bg-green-100 text-green-800" :
                orderData.status === "accepted" ? "bg-blue-100 text-blue-800" :
                orderData.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                orderData.status === "cancelled" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800"}`}
              >
                {updatedStatus && (
                  <span className="mr-1">📢</span>
                )}
                {orderData.status || "pending"}
              </span>
            </p>
            <p className="text-white-600"><span className="font-medium">Total:</span> £{(orderData.totalPrice / 100).toFixed(2)}</p>
            {orderData.totalPoints > 0 && (
              <p className="text-amber-600"><span className="font-medium">Points Earned:</span> {orderData.totalPoints}</p>
            )}
          </div>
          
          <h3 className="text-lg font-semibold mb-4">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orderData.items.map((item: OrderItem, idx: number) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">x{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">£{((item.price * item.quantity) / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="text-center">
        <Link
          href="/menu"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Browse Menu
        </Link>
      </div>
    </div>
  );
} 