"use client"

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// This component handles real-time order status updates for logged-in users
export default function OrderStatusListener() {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const router = useRouter();
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const statusUpdateChannelRef = useRef<BroadcastChannel | null>(null);
  const lastPingTimeRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to create the event source - extracted for reuse
  const createEventSource = useCallback(() => {
    try {
      console.log('CLIENT: Creating SSE connection (attempt ' + (reconnectAttemptsRef.current + 1) + ')');
      
      // Force close any existing connection
      if (eventSourceRef.current) {
        console.log('CLIENT: Closing existing connection before creating a new one');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Create a new EventSource connection
      const eventSource = new EventSource('/api/orders/status-events', { withCredentials: true });
      eventSourceRef.current = eventSource;
      
      // Reset ping timer on new connection
      lastPingTimeRef.current = Date.now();
      
      return eventSource;
    } catch (error) {
      console.error('CLIENT: Error creating EventSource:', error);
      return null;
    }
  }, []);

  // Function to handle health checks for the connection
  const setupConnectionHealthCheck = useCallback(() => {
    // Clear any existing interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    // Set up an interval to check if we've received pings
    pingIntervalRef.current = setInterval(() => {
      // If we haven't received a ping in 30 seconds, connection might be dead
      const now = Date.now();
      const lastPing = lastPingTimeRef.current || 0;
      
      if (connected && now - lastPing > 30000) { // 30 seconds
        console.log('CLIENT: No ping received in last 30 seconds, connection may be stale');
        setConnected(false);
        setLastEvent('Connection stale - attempting reconnect');
        
        // Force reconnect
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          
          // Trigger reconnect by incrementing connection attempt
          setConnectionAttempt(prev => prev + 1);
        }
      }
    }, 10000); // Check every 10 seconds
    
    // Return cleanup function
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [connected]);

  // Broadcast connection status to other components
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('CLIENT: Setting up broadcast channels');
    
    // Create broadcast channels
    const channel = new BroadcastChannel('order-status-connection');
    broadcastChannelRef.current = channel;
    
    const statusChannel = new BroadcastChannel('order-status-updates');
    statusUpdateChannelRef.current = statusChannel;
    
    // Listen for status requests
    channel.addEventListener('message', (event) => {
      if (event.data?.type === 'request-status') {
        console.log('CLIENT: Received request for connection status, broadcasting current status');
        channel.postMessage({ 
          type: 'connection-status', 
          status: connected ? 'connected' : 'disconnected',
          lastEvent,
          reconnectAttempts: reconnectAttemptsRef.current
        });
      }
    });
    
    // Broadcast initial status
    channel.postMessage({ 
      type: 'connection-status', 
      status: 'initializing',
      lastEvent: null
    });
    
    // Set up health check
    const cleanupHealthCheck = setupConnectionHealthCheck();
    
    return () => {
      console.log('CLIENT: Cleaning up broadcast channels');
      channel.close();
      statusChannel.close();
      cleanupHealthCheck();
    };
  }, [setupConnectionHealthCheck]);
  
  // Broadcast status updates when connected state changes
  useEffect(() => {
    if (broadcastChannelRef.current) {
      console.log(`CLIENT: Broadcasting connection status change: ${connected ? 'connected' : 'disconnected'}`);
      broadcastChannelRef.current.postMessage({ 
        type: 'connection-status', 
        status: connected ? 'connected' : 'disconnected',
        lastEvent,
        reconnectAttempts: reconnectAttemptsRef.current
      });
    }
  }, [connected, lastEvent]);

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
        lastPingTimeRef.current = Date.now(); // Mark connection time
        reconnectAttemptsRef.current = 0; // Reset reconnect counter
      };
      
      // Listen for the initial connected event
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('CLIENT: Received connected event:', data);
          setLastEvent(`Connected with ID: ${data.clientId || 'unknown'}, User: ${data.userId || 'unknown'}`);
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
          setLastEvent(`Test: ${data.message || 'unknown'}`);
          lastPingTimeRef.current = Date.now(); // Mark last activity
        } catch (e) {
          console.error('CLIENT: Error parsing test event:', e);
        }
      });
      
      // Listen for reconnect events (server requesting reconnection)
      eventSource.addEventListener('reconnect', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('CLIENT: Server requested reconnect:', data);
          setLastEvent(`Reconnect requested: ${data.message || 'Server requested reconnect'}`);
          
          // Close current connection
          eventSource.close();
          
          // Trigger reconnect with a small delay
          setTimeout(() => {
            setConnectionAttempt(prev => prev + 1);
          }, 1000);
        } catch (e) {
          console.error('CLIENT: Error parsing reconnect event:', e);
        }
      });
      
      // Handle order status updates
      eventSource.addEventListener('order-status-update', (event) => {
        try {
          const data = JSON.parse(event.data);
          const { orderId, oldStatus, newStatus, userId } = data;
          
          console.log(`CLIENT: Received order status update:`, data);
          setLastEvent(`Status update: Order ${orderId.substring(0, 8)}... -> ${newStatus}`);
          lastPingTimeRef.current = Date.now(); // Mark last activity
          
          // Broadcast to other components - CRITICAL PART for notification flow
          if (statusUpdateChannelRef.current) {
            console.log(`CLIENT: Broadcasting status update to other components via BroadcastChannel`);
            statusUpdateChannelRef.current.postMessage({
              type: 'status-update',
              orderId,
              oldStatus,
              newStatus,
              userId,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error('CLIENT: Status update channel is null, cannot broadcast update');
          }
          
          // Create user-friendly notification
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
          
          // Play notification sound
          playNotificationSound();
          
          // Show toast notification
          showToast(statusMessage, statusClass);
          
          // Refresh page data
          router.refresh();
        } catch (error) {
          console.error('CLIENT: Error processing order status update:', error);
        }
      });
      
      // Handle connection errors
      eventSource.onerror = (event) => {
        console.error('CLIENT: SSE connection error:', event);
        setConnected(false);
        setLastEvent(`Connection error at ${new Date().toISOString()}`);
        
        // Close the connection
        eventSource.close();
        eventSourceRef.current = null;
        
        // Implement exponential backoff for reconnection
        const reconnectDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log(`CLIENT: Reconnecting in ${reconnectDelay/1000} seconds (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
          
          reconnectTimeout = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            setConnectionAttempt(prev => prev + 1);
          }, reconnectDelay);
        } else {
          console.log('CLIENT: Maximum reconnection attempts reached.');
          setLastEvent('Maximum reconnection attempts reached. Refresh the page to try again.');
          
          // Show an error toast
          showToast(
            'Lost connection to the server. Please refresh the page to reconnect.',
            'bg-red-100 border-red-400 text-red-800'
          );
        }
      };
    };
    
    // Create and set up the EventSource
    const eventSource = createEventSource();
    if (eventSource) {
      setupEventListeners(eventSource);
    }
    
    // Cleanup function
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      if (eventSourceRef.current) {
        console.log('CLIENT: Closing SSE connection due to component unmount');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [createEventSource, router, connectionAttempt]);
  
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
    console.log('CLIENT: Showing toast notification:', message);
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded shadow-lg ${styleClass} border z-50 transform transition-all duration-500 ease-in-out -translate-y-full opacity-0`;
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
      toast.classList.remove('-translate-y-full', 'opacity-0');
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
      toastEl.classList.add('-translate-y-full', 'opacity-0');
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