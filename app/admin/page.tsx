"use client"

import { useState, useEffect, useRef } from "react";
import { updateOrderStatus as updateOrderStatusAction, getAdminOrders } from '@/actions/admin';
import { getUserProfile } from '@/actions/auth';

// Type definition for an order
type Order = {
  _id: string;
  userId: string | null;
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
  createdAt: string;
  lastUpdated?: string;
  customerInfo: {
    name: string;
    email: string;
    address: string;
  };
};

// Define types for user and userData
type User = {
  userId: string;
  // These fields are no longer needed as they're part of userData now
  // id: string;
  // email: string;
  // role: string;
};

type UserData = {
  email: string;
  isAdmin: boolean;
  points?: number;
};

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // State for toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ 
    message: '', 
    type: null 
  });

  // State for tracking recently updated orders
  const [updatedOrderId, setUpdatedOrderId] = useState<string | null>(null);
  
  // Refs for timers that need cleanup
  const timerRefs = useRef<{
    highlightTimer?: NodeJS.Timeout, 
    toastTimer?: NodeJS.Timeout
  }>({});

  // Helper function to sort orders with most recent updates at the top
  const sortOrdersByRecent = (orders: Order[]): Order[] => {
    return [...orders].sort((a, b) => {
      // First sort by lastUpdated if available
      if (a.lastUpdated && b.lastUpdated) {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
      // Otherwise sort by creation date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  // Setup SSE connection for real-time order updates
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Get current admin user data using server action
        const profileResult = await getUserProfile();
        if (!profileResult.success) throw new Error(profileResult.error || 'Failed to fetch profile');
        
        // Fetch all orders using the server action
        const ordersResult = await getAdminOrders();
        if (!ordersResult.success) throw new Error(ordersResult.error || 'Failed to fetch orders');
        
        if (profileResult.user && profileResult.userData) {
          setUser(profileResult.user as User);
          setUserData(profileResult.userData as UserData);
        }
        
        // Initialize with orders sorted by date
        const sortedOrders = sortOrdersByRecent(ordersResult.orders as unknown as Order[] || []);
        setAllOrders(sortedOrders);
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchInitialData();
    
    // Setup SSE connection
    const setupEventSource = () => {
      const eventSource = new EventSource('/api/orders/events');
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('SSE connection established');
        setConnectionStatus('connected');
      };
      
      eventSource.addEventListener('connected', (event) => {
        console.log('Received connected event:', event.data);
      });
      
      // Handle new order events
      eventSource.addEventListener('new-order', (event) => {
        try {
          console.log('ADMIN: Received new order event:', event.data);
          const data = JSON.parse(event.data);
          const newOrder = data.order as Order;
          
          if (!newOrder || !newOrder._id) {
            console.error('ADMIN: Invalid new order data received:', data);
            return;
          }
          
          console.log('ADMIN: Processing new order:', newOrder._id);
          
          // Add the new order to the state
          setAllOrders(prevOrders => {
            // Check if we already have this order (avoid duplicates)
            if (prevOrders.some(order => order._id === newOrder._id)) {
              console.log(`ADMIN: Order ${newOrder._id} already exists in state, not adding again`);
              return prevOrders;
            }
            
            console.log(`ADMIN: Adding new order ${newOrder._id} to state`);
            
            // Add new order with lastUpdated field
            const orderWithTimestamp = {
              ...newOrder,
              lastUpdated: new Date().toISOString() 
            };
            
            // Re-sort orders with new order included
            return sortOrdersByRecent([orderWithTimestamp, ...prevOrders]);
          });
          
          // Add to new order IDs for highlighting
          setNewOrderIds(prev => {
            const newSet = new Set(prev);
            newSet.add(newOrder._id);
            return newSet;
          });
          
          // Play notification sound
          playNotificationSound();
          
          // Show toast notification
          showToast(`New order received: ${newOrder._id.substring(0, 8)}...`, 'success');
          
          // Clear the highlighting after 10 seconds
          setTimeout(() => {
            setNewOrderIds(prev => {
              const updated = new Set(prev);
              updated.delete(newOrder._id);
              return updated;
            });
          }, 10000);
        } catch (error) {
          console.error('ADMIN: Error processing new order event:', error);
        }
      });
      
      // Handle order update events (status changes)
      eventSource.addEventListener('order-update', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'status-change') {
            const { orderId, oldStatus, newStatus } = data;
            
            console.log(`Received order update: Order ${orderId} (${oldStatus} -> ${newStatus})`);
            
            // Update the order in state
            setAllOrders(prevOrders => {
              const updatedOrders = prevOrders.map(order => 
                order._id === orderId 
                  ? { 
                      ...order, 
                      status: newStatus, 
                      lastUpdated: new Date().toISOString() 
                    } 
                  : order
              );
              
              // Re-sort to ensure updated orders appear at the top
              return sortOrdersByRecent(updatedOrders);
            });
            
            // Set the order as updated for highlighting
            setUpdatedOrderId(orderId);
            
            // Play notification sound
            playNotificationSound();
            
            // Show toast notification
            showToast(`Order ${orderId.substring(0, 8)}... updated to "${newStatus}"`, 'success');
            
            // Clear any existing highlight timer
            if (timerRefs.current.highlightTimer) {
              clearTimeout(timerRefs.current.highlightTimer);
            }
            
            // Clear the highlight after 2 seconds
            timerRefs.current.highlightTimer = setTimeout(() => {
              setUpdatedOrderId(null);
            }, 3000);
          }
        } catch (error) {
          console.error('Error processing order update event:', error);
        }
      });
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus('disconnected');
        
        // Close the connection
        eventSource.close();
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          setupEventSource();
        }, 5000);
      };
    };
    
    setupEventSource();
    
    // Initialize audio element
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/alert.mp3');
    }
    
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  // Function to play notification sound using audio file
  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        console.log('ADMIN: Attempting to play notification sound');
        // Reset the audio to the beginning if it's already playing
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        // Play the notification sound
        audioRef.current.play().catch(e => {
          console.log('ADMIN: Audio play error:', e);
          
          // If autoplay is blocked, try playing with user interaction
          console.log('ADMIN: Note: Most browsers require user interaction before playing audio');
        });
      } else {
        // If audio element doesn't exist yet, create it
        console.log('ADMIN: Creating new Audio element for notification sound');
        try {
          audioRef.current = new Audio('/alert.mp3');
          audioRef.current.play().catch(e => {
            console.log('ADMIN: Audio play error (possibly missing file or autoplay restriction):', e);
            
            // Fallback to browser's native notification sound
            if ('Notification' in window && Notification.permission === 'granted') {
              console.log('ADMIN: Attempting to use browser notification API as fallback');
              new Notification('New Order', { 
                body: 'You have received a new order' 
              });
            }
          });
        } catch (err) {
          console.error('ADMIN: Error creating audio element:', err);
        }
      }
    } catch (error) {
      console.log('ADMIN: Error playing notification sound:', error);
    }
  };

  // Function to show toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    
    // Clear any existing toast timer
    if (timerRefs.current.toastTimer) {
      clearTimeout(timerRefs.current.toastTimer);
    }
    
    // Auto-hide after 3 seconds
    timerRefs.current.toastTimer = setTimeout(() => {
      setToast({ message: '', type: null });
    }, 3000);
  };

  // Clean up all timers when component unmounts
  useEffect(() => {
    return () => {
      // Capture the current timerRefs values to avoid stale references
      const { highlightTimer, toastTimer } = timerRefs.current;
      
      if (highlightTimer) clearTimeout(highlightTimer);
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  // Function to update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // If the new status is "accepted", we need to get the current order first
      const currentOrder = allOrders.find(order => order._id === orderId);
      const oldStatus = currentOrder?.status || '';
      
      // Use the server action directly instead of fetch
      const result = await updateOrderStatusAction(
        orderId,
        newStatus,
        // If we're changing to "accepted", pass a flag to reduce inventory
        newStatus === "accepted" && oldStatus !== "accepted"
      );
      
      if (!result.success) {
        console.error('Failed to update order status:', result.error);
        showToast(result.error || 'Failed to update order status', 'error');
        return;
      }
      
      // Update the order in the state with lastUpdated timestamp
      setAllOrders(prev => {
        const updatedOrders = prev.map(order => 
          order._id === orderId 
            ? { 
                ...order, 
                status: newStatus, 
                lastUpdated: new Date().toISOString() 
              } 
            : order
        );
        
        // Re-sort to ensure updated orders appear at the top
        return sortOrdersByRecent(updatedOrders);
      });
      
      // Set the updated order ID to trigger the highlight effect
      setUpdatedOrderId(orderId);
      
      // Clear any existing highlight timer
      if (timerRefs.current.highlightTimer) {
        clearTimeout(timerRefs.current.highlightTimer);
      }
      
      // Clear the highlight after 2 seconds
      timerRefs.current.highlightTimer = setTimeout(() => {
        setUpdatedOrderId(null);
      }, 2000);
      
      // Show success message
      showToast(`Order status updated to "${newStatus}"`, 'success');
    } catch (error) {
      console.error('Error updating order status:', error);
      showToast('An error occurred while updating order status', 'error');
    }
  };

  function handleOrderClick(orderId: string) {
    // Toggle selection - if already selected, deselect it
    setSelectedOrderId(selectedOrderId === orderId ? null : orderId);
  }
  
  // Find the selected order
  const selectedOrder = allOrders.find(
    order => order._id === selectedOrderId
  );

  if (isLoading) return <p className="text-center py-8">Loading admin dashboard data...</p>;
  if (!user || !userData) return <p className="text-center py-8">Failed to fetch admin data.</p>;
  if (!userData.isAdmin) return <p className="text-center py-8 text-red-500">Access denied. Admin privileges required.</p>;

  return (
    <div className="space-y-8">
      {/* Toast notification */}
      {toast.type && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg transition-all
          ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Customer Orders</h2>
          <div className="text-xs px-2 py-1 rounded">
            {connectionStatus === 'connected' ? (
              <span className="text-green-400 flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full inline-block mr-2"></span>
                Live updates active
              </span>
            ) : connectionStatus === 'connecting' ? (
              <span className="text-yellow-400 flex items-center">
                <span className="h-2 w-2 bg-yellow-500 rounded-full inline-block mr-2"></span>
                Connecting...
              </span>
            ) : (
              <span className="text-red-400 flex items-center">
                <span className="h-2 w-2 bg-red-500 rounded-full inline-block mr-2"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
        
        {allOrders.length === 0 ? (
          <p className="text-gray-500">No orders in the system yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-2 px-4">Order ID</th>
                  <th className="text-left py-2 px-4">User</th>
                  <th className="text-left py-2 px-4">Date / Time</th>
                  <th className="text-left py-2 px-4">Total Items</th>
                  <th className="text-left py-2 px-4">Total Price</th>
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-left py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((order) => {
                  const isNewOrder = newOrderIds.has(order._id);
                  return (
                    <tr 
                      key={order._id}
                      className={`
                        ${selectedOrderId === order._id ? "bg-slate-700 hover:bg-slate-600" : "hover:bg-slate-700"}
                        ${isNewOrder ? "animate-pulse bg-green-900" : ""}
                        ${updatedOrderId === order._id ? "bg-blue-900 transition-colors duration-1000" : ""}
                        transition-colors
                      `}
                    >
                      <td 
                        className={`font-medium cursor-pointer hover:text-blue-400 py-2 px-4 ${
                          selectedOrderId === order._id ? "text-white" :
                          isNewOrder ? "text-white font-bold" :
                          order.status === "completed" ? "text-green-400" :
                          order.status === "pending" ? "text-yellow-400" :
                          "text-gray-300"
                        }`}
                        onClick={() => handleOrderClick(order._id)}
                      >
                        {isNewOrder && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>}
                        {order._id.substring(0, 10)}...
                      </td>
                      <td className={`py-2 px-4 ${selectedOrderId === order._id ? "text-white" : "text-slate-300"}`}>
                        {order.userId ? order.userId.substring(0, 8) : "Unknown User"}
                      </td>
                      <td className={`py-2 px-4 ${selectedOrderId === order._id ? "text-white" : "text-slate-300"}`}>
                        {new Date(order.createdAt).toLocaleDateString("en-GB")} - {new Date(order.createdAt).toLocaleTimeString("en-GB")}
                      </td>
                      <td className={`py-2 px-4 ${selectedOrderId === order._id ? "text-white" : "text-slate-300"}`}>
                        {order.items?.reduce((total, item) => total + (item.quantity || 1), 0) || 0} items
                      </td>
                      <td className={`py-2 px-4 ${selectedOrderId === order._id ? "text-white" : "text-slate-300"}`}>
                        £{order.totalPrice ? (order.totalPrice / 100).toFixed(2) : "N/A"}
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          order.status === "completed" ? "bg-green-100 text-green-800" :
                          order.status === "accepted" ? "bg-blue-100 text-blue-800" :
                          order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          order.status === "cancelled" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {order.status || "pending"}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <select 
                          className="bg-slate-700 text-white border border-slate-600 rounded py-1 px-2"
                          value={order.status || "pending"}
                          onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="accepted">Accepted</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
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
              <p className="text-slate-300"><span className="font-medium">User ID:</span> {selectedOrder.userId || "Unknown"}</p>
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
                    <th className="text-white py-2 px-4">Item</th>
                    <th className="text-white py-2 px-4">Price</th>
                    <th className="text-white py-2 px-4">Quantity</th>
                    <th className="text-white py-2 px-4">Subtotal</th>
                    <th className="text-white py-2 px-4">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-600 hover:bg-slate-600">
                      <td className="font-medium py-2 px-4">{item.name}</td>
                      <td className="py-2 px-4">£{(item.price / 100).toFixed(2)}</td>
                      <td className="py-2 px-4">{item.quantity}</td>
                      <td className="py-2 px-4">£{((item.price * item.quantity) / 100).toFixed(2)}</td>
                      <td className="text-amber-600 py-2 px-4">{(item.points * item.quantity)}</td>
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
