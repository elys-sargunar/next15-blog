"use client"

import dynamic from 'next/dynamic';

// Dynamically import the OrderStatusIndicator component to avoid SSR issues
const OrderStatusIndicator = dynamic(() => import('@/components/OrderStatusIndicator'), {
  ssr: false, // Don't attempt to render on the server
});

export default function OrderStatusIndicatorWrapper() {
  // This component is just a wrapper to ensure client-side rendering
  return <OrderStatusIndicator />;
} 