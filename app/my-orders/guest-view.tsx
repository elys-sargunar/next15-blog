"use client"

import { useState } from "react";
import Link from "next/link";

export default function GuestOrdersView() {
  const [orderId, setOrderId] = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Order Lookup</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <p className="mb-4">Enter your order ID to track your order:</p>
        
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
            className={`px-6 py-2 rounded-lg text-white transition ${
              isLoading ? "bg-green-400" : "bg-slate-800 hover:bg-green-700"
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
      
      {orderData && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold mb-2">Order Details</h2>
            <p className="text-gray-600">Order ID: {orderData._id}</p>
            <p className="text-gray-600">Date: {new Date(orderData.createdAt).toLocaleString()}</p>
            <p className="text-gray-600">Status: {orderData.status || "pending"}</p>
            <p className="text-gray-600">Total: £{(orderData.totalPrice / 100).toFixed(2)}</p>
          </div>
          
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <ul className="divide-y">
              {orderData.items.map((item: any, idx: number) => (
                <li key={idx} className="py-3 flex justify-between">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-500 ml-2">x{item.quantity}</span>
                  </div>
                  <span>£{((item.price * item.quantity) / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      <div className="mt-8 text-center">
        <Link
          href="/menu"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
        >
          Browse Menu
        </Link>
      </div>
    </div>
  );
} 