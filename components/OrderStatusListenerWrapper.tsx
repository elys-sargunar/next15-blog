"use client"

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the OrderStatusListener component to avoid SSR issues
const OrderStatusListener = dynamic(() => import('./OrderStatusListener'), {
  ssr: false, // Don't attempt to render on the server
});

export default function OrderStatusListenerWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Don't try to fetch anything during SSR
    if (typeof window === 'undefined') return;
    
    // Use a flag to track if the component is still mounted
    let isMounted = true;
    
    // Check authentication status on the client side
    async function checkAuth() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/profile', {
          // Add cache control to prevent stale data
          headers: { 'Cache-Control': 'no-cache' },
          // Ensure credentials are sent
          credentials: 'include'
        });
        
        // Only update state if component is still mounted
        if (isMounted) {
          setIsAuthenticated(response.ok);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        // Only update state if component is still mounted
        if (isMounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    }
    
    checkAuth();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Don't show anything during the initial load
  if (isLoading) return null;
  
  // Only render the OrderStatusListener for authenticated users
  return isAuthenticated ? <OrderStatusListener /> : null;
} 