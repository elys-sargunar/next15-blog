"use client"

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import the OrdersTable component to avoid SSR issues
const OrdersTable = dynamic(() => import('@/components/OrdersTable'), {
  ssr: false, // Don't attempt to render on the server
});

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
  userId?: string;
};

export default function OrdersTableWrapper({ 
  initialOrders, 
  currentUserId 
}: { 
  initialOrders: Order[],
  currentUserId?: string
}) {
  // Check if there are no orders and handle the empty state directly in the wrapper
  if (!initialOrders || initialOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-500 mb-6">You haven&apos;t placed any orders yet</p>
        <Link 
          href="/menu" 
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Browse Menu
        </Link>
      </div>
    );
  }
  
  // Pass the orders to the client component for real-time updating
  return <OrdersTable initialOrders={initialOrders} currentUserId={currentUserId} />;
} 