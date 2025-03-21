"use client"

import { useState, useEffect } from "react";
import { deletePost } from "@/actions/posts";
import { getOrdersByUserId } from "@/actions/orders";
import { getCollection } from "@/lib/db";
import getAuthUser from "@/lib/getAuthUser";
import Link from "next/link";

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Get current admin user data
        const userResponse = await fetch('/api/user/profile');
        if (!userResponse.ok) throw new Error('Failed to fetch profile');
        const userData = await userResponse.json();
        
        // Fetch all orders (admin-only endpoint)
        const ordersResponse = await fetch('/api/admin/orders');
        if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
        const ordersData = await ordersResponse.json();
        
        setUser(userData.user);
        setUserData(userData.userData);
        setAllOrders(ordersData.orders || []);
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
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
  const selectedOrder = allOrders.find(
    order => order._id.toString() === selectedOrderId
  );

  if (isLoading) return <p className="text-center py-8">Loading admin dashboard data...</p>;
  if (!user || !userData) return <p className="text-center py-8">Failed to fetch admin data.</p>;
  if (!userData.isAdmin) return <p className="text-center py-8 text-red-500">Access denied. Admin privileges required.</p>;

  return (
    <div className="space-y-8">
      {/* Admin Information Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Admin Information</h2>
          <p><span className="font-medium">Email:</span> {userData.email}</p>
          <p><span className="font-medium">Role:</span> 
            <span className="text-red-600 font-bold ml-2">Administrator</span>
          </p>
        </div>
      </div>

      {/* All Orders Section */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-md text-white">
        <h2 className="text-xl font-semibold mb-4">All Customer Orders</h2>
        {!allOrders || allOrders.length === 0 ? (
          <p className="text-gray-500">No orders in the system yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>User</th>
                  <th>Date / Time</th>
                  <th>Total Items</th>
                  <th>Total Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((order) => (
                  <tr 
                    key={order._id.toString()}
                    className={selectedOrderId === order._id.toString() ? "bg-slate-700 hover:bg-slate-600" : undefined}
                  >
                    <td 
                      className={`font-medium cursor-pointer hover:text-blue-400 ${
                        selectedOrderId === order._id.toString() ? "text-white" :
                        order.status === "completed" ? "text-green-400" :
                        order.status === "pending" ? "text-yellow-400" :
                        "text-gray-300"
                      }`}
                      onClick={() => handleOrderClick(order._id.toString())}
                    >
                      {order._id.toString().substring(0, 10)}...
                    </td>
                    <td className={selectedOrderId === order._id.toString() ? "text-white" : "text-slate-300"}>
                      {order.userId ? order.userId.toString().substring(0, 8) : "Guest"}
                    </td>
                    <td className={selectedOrderId === order._id.toString() ? "text-white" : "text-slate-300"}>
                      {new Date(order.createdAt).toLocaleDateString("en-GB")} - {new Date(order.createdAt).toLocaleTimeString("en-GB")}
                    </td>
                    <td className={selectedOrderId === order._id.toString() ? "text-white" : "text-slate-300"}>
                      {order.items?.reduce((total: number, item: any) => total + (item.quantity || 1), 0) || 0} items
                    </td>
                    <td className={selectedOrderId === order._id.toString() ? "text-white" : "text-slate-300"}>
                      £{order.totalPrice ? (order.totalPrice / 100).toFixed(2) : "N/A"}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.status === "completed" ? "bg-green-100 text-green-800" :
                        order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {order.status || "pending"}
                      </span>
                    </td>
                    <td>
                      <select 
                        className="bg-slate-700 text-white border border-slate-600 rounded py-1 px-2"
                        value={order.status || "pending"}
                        onChange={(e) => {
                          // We'll implement this function later
                          // updateOrderStatus(order._id.toString(), e.target.value);
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
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
              <p className="text-slate-300"><span className="font-medium">User ID:</span> {selectedOrder.userId ? selectedOrder.userId.toString() : "Guest Order"}</p>
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
                    <th className="text-white">Price</th>
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
