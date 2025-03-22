"use client"

import { useState, useEffect } from "react";
import { deletePost } from "@/actions/posts";
import { getOrdersByUserId } from "@/actions/orders";
import { getCollection } from "@/lib/db";
import getAuthUser from "@/lib/getAuthUser";
import { ObjectId } from "mongodb";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user and their orders
        const response = await fetch('/api/user/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        
        setUser(data.user);
        setUserData(data.userData);
        setUserOrders(data.orders || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  function handleOrderClick(orderId: string) {
    // Toggle selection - if already selected, deselect it
    setSelectedOrderId(selectedOrderId === orderId ? null : orderId);
  }
  
  // Find the selected order
  const selectedOrder = userOrders.find(
    order => order._id.toString() === selectedOrderId
  );

  if (isLoading) return <p className="text-center py-8">Loading dashboard data...</p>;
  if (!user || !userData) return <p className="text-center py-8">Failed to fetch user data.</p>;

  return (
    <div className="space-y-8">
      {/* User Information Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Your Information</h2>
          <p><span className="font-medium">Email:</span> {userData.email}</p>
          <p><span className="font-medium">Reward Points:</span> 
            <span className="text-amber-600 font-bold ml-2">{userData.points || 0} points</span>
          </p>
        </div>
      </div>

      {/* Orders Section */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-md text-white">
        <h2 className="text-xl font-semibold mb-4">Your Orders</h2>
        {!userOrders || userOrders.length === 0 ? (
          <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date / Time</th>
                  <th>Total Items</th>
                  <th>Total Price</th>
                  <th>Points Earned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {userOrders.map((order) => (
                  <tr 
                    key={order._id.toString()}
                    className={selectedOrderId === order._id.toString() ? "bg-slate-700 hover:bg-slate-600" : undefined}
                  >
                    <td 
                      className={`font-medium cursor-pointer hover:text-blue-400 ${
                        selectedOrderId === order._id.toString() ? "text-white" :
                        order.status === "completed" ? "text-green-400" :
                        order.status === "pending" ? "text-slate-800" :
                        "text-gray-300"
                      }`}
                      onClick={() => handleOrderClick(order._id.toString())}
                    >
                      {order._id.toString().substring(0, 10)}...
                    </td>
                    <td className={selectedOrderId === order._id.toString() ? "text-white" : "text-slate-800"}>{new Date(order.createdAt).toLocaleDateString("en-GB")} - {new Date(order.createdAt).toLocaleTimeString("en-GB")}</td>
                    <td className={selectedOrderId === order._id.toString() ? "text-white" : "text-slate-800"}>
                      {order.items?.reduce((total: number, item: any) => total + (item.quantity || 1), 0) || 0} items
                    </td>
                    <td className={selectedOrderId === order._id.toString() ? "text-white" : "text-slate-800"}>£{order.totalPrice ? (order.totalPrice / 100).toFixed(2) : "N/A"}</td>
                    <td className={selectedOrderId === order._id.toString() ? "text-white" : "text-amber-600 font-medium"}>{order.totalPoints || 0}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.status === "completed" ? "bg-green-100 text-green-800" :
                        order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {order.status || "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Selected Order Details */}
        {selectedOrder && (
          <div className="mt-8 border-t border-slate-600 pt-6">
            <h3 className="text-lg font-semibold mb-4">Order Details</h3>
            
            <div className="mb-6">
              <p className="text-slate-300"><span className="font-medium">Order ID:</span> {selectedOrder._id}</p>
              <p className="text-slate-300"><span className="font-medium">Date:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              <p className="text-slate-300"><span className="font-medium">Status:</span> {selectedOrder.status || "pending"}</p>
              <p className="text-slate-300"><span className="font-medium">Total Price:</span> £{(selectedOrder.totalPrice / 100).toFixed(2)}</p>
              <p className="text-slate-300"><span className="font-medium">Points Earned:</span> <span className="text-amber-600">{selectedOrder.totalPoints || 0}</span></p>
            </div>
            
            <h4 className="font-medium mb-2">Items Ordered:</h4>
            <div className="overflow-x-auto">
              <table className="w-full bg-slate-700 mb-0 rounded">
                <thead className="bg-slate-600">
                  <tr>
                    <th className="text-white">Item</th>
                    <th className="text-white"  >Price</th>
                    <th className="text-white">Quantity</th>
                    <th className="text-white">Subtotal</th>
                    <th className="text-white">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-slate-600 hover:bg-slate-600">
                      <td className="font-medium">{item.name}</td>
                      <td>£{(item.price / 100).toFixed(2)}</td>
                      <td>{item.quantity}</td>
                      <td>£{((item.price * item.quantity) / 100).toFixed(2)}</td>
                      <td className="text-amber-600">{((item.points || 0) * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>    
    </div>
  );
}
