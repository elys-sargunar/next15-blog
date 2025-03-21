"use client"

import { useEffect, useState } from 'react';

// This component can be placed on order-related pages to show the connection status
export default function OrderStatusIndicator() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'unavailable'>('unavailable');
  
  useEffect(() => {
    // Create a message channel to communicate with the OrderStatusListener
    const channel = new BroadcastChannel('order-status-connection');
    
    // Listen for status updates
    channel.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'connection-status') {
        setConnectionStatus(event.data.status);
      }
    });
    
    // Request current status when mounted
    channel.postMessage({ type: 'request-status' });
    
    // Cleanup on unmount
    return () => {
      channel.close();
    };
  }, []);
  
  // No need to show anything if status is unavailable (probably user not logged in)
  if (connectionStatus === 'unavailable') return null;
  
  let statusDisplay = {
    text: '',
    color: '',
    icon: ''
  };
  
  switch (connectionStatus) {
    case 'connected':
      statusDisplay = {
        text: 'Live updates active',
        color: 'text-green-600',
        icon: 'bg-green-500'
      };
      break;
    case 'connecting':
      statusDisplay = {
        text: 'Connecting to live updates...',
        color: 'text-yellow-600',
        icon: 'bg-yellow-500'
      };
      break;
    case 'disconnected':
      statusDisplay = {
        text: 'Live updates disconnected',
        color: 'text-red-600',
        icon: 'bg-red-500'
      };
      break;
  }
  
  return (
    <div className="text-xs px-2 py-1 rounded flex items-center">
      <span className={`h-2 w-2 ${statusDisplay.icon} rounded-full inline-block mr-2`}></span>
      <span className={statusDisplay.color}>{statusDisplay.text}</span>
    </div>
  );
} 