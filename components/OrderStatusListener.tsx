"use client"

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// This component handles real-time order status updates for logged-in users
export default function OrderStatusListener() {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    status: string;
    timestamp: string;
    seen: boolean;
  }>>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const router = useRouter();
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const statusUpdateChannelRef = useRef<BroadcastChannel | null>(null);

  // Broadcast connection status to other components
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Create a broadcast channel for connection status communication
    const channel = new BroadcastChannel('order-status-connection');
    broadcastChannelRef.current = channel;
    
    // Create a separate channel for order status updates
    const statusChannel = new BroadcastChannel('order-status-updates');
    statusUpdateChannelRef.current = statusChannel;
    
    // Listen for status requests
    channel.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'request-status') {
        // Send current status
        channel.postMessage({ 
          type: 'connection-status', 
          status: connected ? 'connected' : (reconnectAttemptsRef.current > 0 ? 'disconnected' : 'connecting')
        });
      }
    });
    
    // Cleanup on unmount
    return () => {
      channel.close();
      statusChannel.close();
      broadcastChannelRef.current = null;
      statusUpdateChannelRef.current = null;
    };
  }, [connected]);

  // Broadcast connection status whenever it changes
  useEffect(() => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ 
        type: 'connection-status', 
        status: connected ? 'connected' : (reconnectAttemptsRef.current > 0 ? 'disconnected' : 'connecting')
      });
    }
  }, [connected, reconnectAttemptsRef.current]);

  useEffect(() => {
    // Only attempt to connect if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    let reconnectTimeout: NodeJS.Timeout;
    
    const setupEventSource = () => {
      try {
        // Close any existing connection first
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        
        console.log('Attempting to establish SSE connection...');
        
        // Create new EventSource with credentials
        const eventSource = new EventSource('/api/orders/status-events', { withCredentials: true });
        eventSourceRef.current = eventSource;
        
        eventSource.onopen = () => {
          console.log('SSE connection established for order status updates');
          setConnected(true);
          reconnectAttemptsRef.current = 0; // Reset reconnect counter on successful connection
        };
        
        eventSource.addEventListener('connected', (event) => {
          console.log('Received connected event:', event.data);
        });
        
        eventSource.addEventListener('order-status-update', (event) => {
          try {
            const data = JSON.parse(event.data);
            const { orderId, oldStatus, newStatus } = data;
            
            // Broadcast the status update to the OrdersTable
            if (statusUpdateChannelRef.current) {
              statusUpdateChannelRef.current.postMessage({
                type: 'status-update',
                orderId,
                oldStatus,
                newStatus
              });
            }
            
            // Create a user-friendly message based on the new status
            let statusMessage = `Your order ${orderId.substring(0, 8)}... `;
            let statusClass = '';
            
            switch(newStatus) {
              case 'accepted':
                statusMessage += 'has been accepted! Your food is being prepared.';
                statusClass = 'bg-blue-100 border-blue-400 text-blue-800';
                break;
              case 'completed':
                statusMessage += 'is ready! Enjoy your meal.';
                statusClass = 'bg-green-100 border-green-400 text-green-800';
                break;
              case 'cancelled':
                statusMessage += 'has been cancelled. Please contact support for assistance.';
                statusClass = 'bg-red-100 border-red-400 text-red-800';
                break;
              default:
                statusMessage += `status has been updated to ${newStatus}.`;
                statusClass = 'bg-gray-100 border-gray-400 text-gray-800';
            }
            
            // Create a unique notification ID
            const notificationId = `${orderId}-${Date.now()}`;
            
            // Add the notification to the list
            setNotifications(prev => [
              {
                id: notificationId,
                message: statusMessage,
                status: newStatus,
                timestamp: new Date().toISOString(),
                seen: false
              },
              ...prev
            ]);
            
            // Show toast notification
            showToast(statusMessage, statusClass);
            
            // We no longer need to refresh the page since we're updating the table directly
            // if (window.location.pathname === '/my-orders') {
            //   router.refresh();
            // }
          } catch (error) {
            console.error('Error processing order status update:', error);
          }
        });
        
        eventSource.onerror = (event) => {
          // Check if we're still mounted
          if (!eventSourceRef.current) return;
          
          console.error('SSE connection error:', event);
          setConnected(false);
          
          // Close the connection
          eventSource.close();
          eventSourceRef.current = null;
          
          // Implement exponential backoff for reconnection attempts
          const reconnectDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Max 30 seconds
          
          console.log(`Reconnect attempt ${reconnectAttemptsRef.current + 1} in ${reconnectDelay/1000} seconds...`);
          
          // If we haven't exceeded max reconnect attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectTimeout = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              setupEventSource();
            }, reconnectDelay);
          } else {
            console.log('Maximum reconnection attempts reached. Giving up.');
            // Maybe show a UI message to the user that real-time updates are not available
          }
        };
      } catch (error) {
        console.error('Error setting up SSE connection:', error);
        setConnected(false);
      }
    };
    
    // Initial connection attempt
    setupEventSource();
    
    // Cleanup on unmount
    return () => {
      console.log('OrderStatusListener unmounting, cleaning up connections');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [router]);
  
  // Function to show a toast notification
  const showToast = (message: string, styleClass: string) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 p-4 rounded shadow-lg ${styleClass} border z-50 transform transition-all duration-500 translate-y-full opacity-0`;
    toast.style.maxWidth = '90vw';
    toast.style.width = '400px';
    
    // Add message
    toast.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1 mr-4">${message}</div>
        <button class="text-gray-600 hover:text-gray-800" aria-label="Close notification">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show toast with animation
    setTimeout(() => {
      toast.classList.remove('translate-y-full', 'opacity-0');
    }, 10);
    
    // Add click handler for close button
    toast.querySelector('button')?.addEventListener('click', () => {
      closeToast(toast);
    });
    
    // Auto-close after 6 seconds
    const timeout = setTimeout(() => {
      closeToast(toast);
    }, 6000);
    
    // Helper function to close toast with animation
    function closeToast(toastEl: HTMLElement) {
      toastEl.classList.add('translate-y-full', 'opacity-0');
      clearTimeout(timeout);
      
      // Remove from DOM after animation
      setTimeout(() => {
        if (document.body.contains(toastEl)) {
          document.body.removeChild(toastEl);
        }
      }, 500);
    }
  };
  
  // This component doesn't render anything visible, it just listens for events
  return null;
} 