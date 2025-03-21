"use client"

import { useEffect, useState, useRef } from 'react';

// Define Order type
type Order = {
  _id: string;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    points: number;
    quantity: number;
  }>;
  totalPrice: number;
  totalPoints: number;
  status: string;
};

export default function OrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  // Maintain a state copy of the orders that we can update
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  // Track recently updated orders for highlighting
  const [updatedOrderId, setUpdatedOrderId] = useState<string | null>(null);
  // Ref to store timeout ID for clearing highlighting
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Create a broadcast channel to listen for order status updates
    const channel = new BroadcastChannel('order-status-updates');
    
    // Listen for status updates
    channel.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'status-update') {
        const { orderId, newStatus } = event.data;
        
        // Update the specific order's status in our state
        setOrders(currentOrders => 
          currentOrders.map(order => 
            order._id === orderId 
              ? { ...order, status: newStatus } 
              : order
          )
        );
        
        // Set the updated order ID to trigger the highlight effect
        setUpdatedOrderId(orderId);
        
        // Clear any existing timeout
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        
        // Clear the highlight after 3 seconds
        highlightTimeoutRef.current = setTimeout(() => {
          setUpdatedOrderId(null);
          highlightTimeoutRef.current = null;
        }, 3000);
      }
    });
    
    // Cleanup on unmount
    return () => {
      channel.close();
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);
  
  // If there are no orders, show a message
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-500 mb-6">You haven't placed any orders yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date / Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Items
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Points
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orders.map((order) => (
            <tr 
              key={order._id.toString()}
              className={`transition-all duration-300 ${
                updatedOrderId === order._id 
                  ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                  : ''
              }`}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                {order._id.toString().substring(0, 8)}...
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString("en-GB")} - {new Date(order.createdAt).toLocaleTimeString("en-GB")}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {order.items?.reduce((total: number, item: any) => total + (item.quantity || 1), 0) || 0} items
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                £{order.totalPrice ? (order.totalPrice / 100).toFixed(2) : "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-medium">
                {order.totalPoints || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${order.status === "completed" ? "bg-green-100 text-green-800" :
                    order.status === "accepted" ? "bg-blue-100 text-blue-800" :
                    order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    order.status === "cancelled" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"}`}>
                  {order.status || "pending"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 