"use client"

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Create a type for the window with our custom property
interface CustomWindow extends Window {
  __orderStatusListenerCount?: number;
}

// This component handles real-time order status updates for logged-in users
export default function OrderStatusListener() {
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // Remove the unused lastPollTime state since we're using the ref directly
  const lastPollTimeRef = useRef<string>(new Date().toISOString());
  
  // Refs for timers and event source
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef<number>(Date.now());
  const pingCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  
  // Add polling interval ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  
  // Channel for broadcasting status to other components like the indicator
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  
  // Add instance tracking
  useEffect(() => {
    // Don't run on server
    if (typeof window === 'undefined') return;
    
    // Check if an instance is already mounted
    const customWindow = window as CustomWindow;
    if (customWindow.__orderStatusListenerCount) {
      console.warn('Multiple OrderStatusListener instances detected. This can cause polling issues.');
      customWindow.__orderStatusListenerCount++;
    } else {
      customWindow.__orderStatusListenerCount = 1;
    }
    
    return () => {
      // Cleanup on unmount
      if (typeof window !== 'undefined') {
        const customWindow = window as CustomWindow;
        if (customWindow.__orderStatusListenerCount) {
          customWindow.__orderStatusListenerCount--;
        }
      }
    };
  }, []);
  
  // Expose connection status to other components
  useEffect(() => {
    // Don't run on server
    if (typeof window === 'undefined') return;
    
    // Create a broadcast channel to communicate with the OrderStatusIndicator
    const channel = new BroadcastChannel('order-status-connection');
    broadcastChannelRef.current = channel;
    
    // Listen for status requests from indicators
    channel.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'request-status') {
        // Send current status
        channel.postMessage({
          type: 'connection-status',
          status: connectionStatus
        });
      }
    });
    
    // Initial broadcast
    channel.postMessage({
      type: 'connection-status',
      status: connectionStatus
    });
    
    // Cleanup
    return () => {
      channel.close();
    };
  }, [connectionStatus]);
  
  // Setup polling for order updates via the monitor endpoint
  useEffect(() => {
    // Don't run on server
    if (typeof window === 'undefined') return;
    
    async function pollOrderUpdates() {
      try {
        // Use the ref value instead of state
        const response = await fetch(`/api/orders/monitor?since=${encodeURIComponent(lastPollTimeRef.current)}`);
        if (!response.ok) {
          console.error('CLIENT: Order monitor poll failed:', response.statusText);
          return;
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Only update the ref value, not the state since it's been removed
          lastPollTimeRef.current = data.timestamp;
          
          if (data.newOrders > 0 || data.updatedOrders > 0) {
            console.log(`CLIENT: Poll found ${data.newOrders} new orders and ${data.updatedOrders} updated orders`);
          }
        }
      } catch (error) {
        console.error('CLIENT: Error polling order updates:', error);
      }
    }
    
    // Initial poll on mount
    pollOrderUpdates();
    
    // Poll every 30 seconds - only create ONE interval
    const intervalId = setInterval(pollOrderUpdates, 30000);
    pollIntervalRef.current = intervalId;
    
    // Cleanup on unmount - make sure we clear the interval
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        pollIntervalRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount
  
  // Setup EventSource connection and event listeners
  useEffect(() => {
    // Don't run on server
    if (typeof window === 'undefined') return;
    
    console.log('CLIENT: Setting up EventSource connection');
    
    let reconnectTimeout: NodeJS.Timeout;
    
    const setupEventListeners = (eventSource: EventSource) => {
      // Connection opened
      eventSource.onopen = () => {
        console.log('CLIENT: SSE connection established');
        setConnected(true);
        setConnectionStatus('connected');
        lastPingTimeRef.current = Date.now(); // Mark connection time
        reconnectAttemptsRef.current = 0; // Reset reconnect counter
        
        // Broadcast connection status to indicator components
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'connection-status',
            status: 'connected'
          });
        }
      };
      
      // Listen for the initial connected event
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('CLIENT: Received connected event:', data);
          lastPingTimeRef.current = Date.now(); // Mark last activity
          
          // Force refresh to update UI
          router.refresh();
        } catch (e) {
          console.error('CLIENT: Error parsing connected event:', e);
        }
      });
      
      // Listen for all events for debugging
      eventSource.onmessage = (event) => {
        console.log('CLIENT: Received raw event:', event);
        // Update ping time for any message
        lastPingTimeRef.current = Date.now();
      };
      
      // Listen for keepalive pings
      eventSource.addEventListener('ping', () => {
        console.log('CLIENT: Received ping event');
        lastPingTimeRef.current = Date.now();
      });
      
      // Listen for test events
      eventSource.addEventListener('test', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('CLIENT: Received test event:', data);
          lastPingTimeRef.current = Date.now(); // Mark last activity
        } catch (e) {
          console.error('CLIENT: Error parsing test event:', e);
        }
      });
      
      // Listen for reconnect events (server requesting reconnection)
      eventSource.addEventListener('reconnect', (event) => {
        console.log('CLIENT: Received reconnect request from server');
        try {
          const data = JSON.parse(event.data);
          console.log('CLIENT: Reconnect requested:', data.message || 'unknown');
          
          // Close the current connection
          eventSource.close();
          
          // Attempt to reconnect after a short delay
          setTimeout(() => {
            console.log('CLIENT: Reconnecting as requested by server...');
            setupSSE();
          }, 1000);
        } catch (e) {
          console.error('CLIENT: Error parsing reconnect event:', e);
        }
      });
      
      // Listen for order-status-update events
      eventSource.addEventListener('order-status-update', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('CLIENT: Received order status update:', data);
          
          // Update last activity time
          lastPingTimeRef.current = Date.now();
          
          // Get status transition for better notifications
          const oldStatus = data.oldStatus || 'new';
          const newStatus = data.newStatus || 'unknown';
          
          console.log(`CLIENT: Order status updated: ${oldStatus} -> ${newStatus}`);
          
          // Create a more descriptive message based on the status
          let message = `Order status updated to: ${newStatus}`;
          let styleClass = 'bg-blue-100 border-blue-500';
          
          // Customize message based on status
          if (newStatus === 'accepted') {
            message = 'Your order has been accepted! The kitchen is preparing your food.';
            styleClass = 'bg-blue-100 border-blue-500';
          } else if (newStatus === 'completed') {
            message = 'Your order is now complete! Thank you for your purchase.';
            styleClass = 'bg-green-100 border-green-500';
          } else if (newStatus === 'cancelled') {
            message = 'Your order has been cancelled.';
            styleClass = 'bg-red-100 border-red-500';
          }
          
          // Broadcast the update to other components
          try {
            const statusUpdateChannel = new BroadcastChannel('order-status-updates');
            statusUpdateChannel.postMessage({
              type: 'status-update',
              ...data
            });
            
            // Give a moment for the message to be sent before closing
            setTimeout(() => {
              statusUpdateChannel.close();
            }, 100);
            
            console.log('CLIENT: Broadcasted status update to other components');
          } catch (broadcastError) {
            console.error('CLIENT: Error broadcasting status update:', broadcastError);
          }
          
          // Play notification sound and show toast
          playNotificationSound();
          showToast(message, styleClass);
          
          // Force refresh to update UI
          router.refresh();
        } catch (e) {
          console.error('CLIENT: Error parsing order status update:', e);
        }
      });
      
      // Handle errors
      eventSource.onerror = (error) => {
        console.error('CLIENT: EventSource error:', error);
        setConnected(false);
        setConnectionStatus('disconnected');
        console.error('CLIENT: Connection error. Attempting to reconnect...');
        
        // Broadcast disconnected status
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'connection-status',
            status: 'disconnected'
          });
        }
        
        // Close the connection
        eventSource.close();
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const backoffTime = Math.min(1000 * (2 ** reconnectAttemptsRef.current), 30000);
          console.log(`CLIENT: Will attempt to reconnect in ${backoffTime}ms (attempt ${reconnectAttemptsRef.current + 1} of ${maxReconnectAttempts})`);
          
          reconnectTimeout = setTimeout(() => {
            reconnectAttemptsRef.current++;
            console.log(`CLIENT: Attempting to reconnect (${reconnectAttemptsRef.current} of ${maxReconnectAttempts})...`);
            setupSSE();
          }, backoffTime);
        } else {
          console.error('CLIENT: Max reconnect attempts reached.');
          
          // Stop the ping checker
          if (pingCheckIntervalRef.current) {
            clearInterval(pingCheckIntervalRef.current);
          }
        }
      };
    };
    
    // Function to set up the SSE connection
    const setupSSE = () => {
      setConnectionStatus('connecting');
      
      // Broadcast connecting status
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'connection-status',
          status: 'connecting'
        });
      }
      
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      console.log('CLIENT: Creating new EventSource...');
      const eventSource = new EventSource('/api/orders/status-events');
      eventSourceRef.current = eventSource;
      
      // Setup all event listeners
      setupEventListeners(eventSource);
    };
    
    // Start the connection
    setupSSE();
    
    // Set up a ping checker to detect stale connections
    pingCheckIntervalRef.current = setInterval(() => {
      const lastPingTime = lastPingTimeRef.current;
      const now = Date.now();
      const timeSinceLastPing = now - lastPingTime;
      
      // If we haven't received a ping in over 2 minutes, the connection is probably stale
      if (timeSinceLastPing > 120000 && connected) {
        console.log(`CLIENT: No activity for ${Math.floor(timeSinceLastPing / 1000)}s, reconnecting...`);
        setConnected(false);
        setConnectionStatus('disconnected');
        
        // Broadcast disconnected status
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'connection-status',
            status: 'disconnected'
          });
        }
        
        // Close and reconnect
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        
        // Small delay before reconnecting
        reconnectTimeoutRef.current = setTimeout(() => {
          setupSSE();
        }, 1000);
      }
    }, 30000); // Check every 30 seconds
    
    // Cleanup function
    return () => {
      console.log('CLIENT: Cleaning up SSE connection');
      
      // Close the event source if it exists
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Clear any pending timeouts
      clearTimeout(reconnectTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Clear ping checker interval
      if (pingCheckIntervalRef.current) {
        clearInterval(pingCheckIntervalRef.current);
      }
    };
  }, [router, connected]);
  
  // Play notification sound for status updates
  const playNotificationSound = () => {
    try {
      console.log('CLIENT: Playing notification sound');
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      
      const playPromise = audio.play();
      
      // Handle autoplay restrictions
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('CLIENT: Autoplay prevented:', error);
          // User interaction is needed to play audio
        });
      }
    } catch (error) {
      console.error('CLIENT: Error playing sound:', error);
    }
  };
  
  // Show toast notification
  const showToast = (message: string, styleClass: string) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 max-w-md p-4 rounded-md shadow-lg border-l-4 ${styleClass} transform transition-all duration-500 translate-y-full opacity-0 z-50`;
    
    // Add message
    toast.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1 mr-4 font-medium">${message}</div>
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
    
    // Auto-close after 10 seconds (longer duration)
    const timeout = setTimeout(() => {
      closeToast(toast);
    }, 10000);
    
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
  
  // This component doesn't render anything visible
  return null;
}