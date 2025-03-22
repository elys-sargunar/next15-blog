import { getOrdersByUserId } from "@/actions/orders";
import { getCollection } from "@/lib/db";
import getAuthUser from "@/lib/getAuthUser";
import GuestOrdersView from "./guest-view";
import { ObjectId } from "mongodb";
import OrderStatusIndicatorWrapper from "./status-indicator";
import OrdersTableWrapper from "./orders-table-wrapper";

// Define the Order type to match what our client components expect
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
};

export default async function MyOrdersPage() {
  // Check if the user is signed in
  const user = await getAuthUser();
  
  // If no user is logged in, show the guest view
  if (!user) {
    return <GuestOrdersView />;
  }

  // Fetch complete user data including points
  const usersCollection = await getCollection("users");
  const userData = await usersCollection?.findOne({ 
    _id: ObjectId.createFromHexString(user.userId as string) 
  });

  // Fetch orders for the current user
  const mongoOrders = await getOrdersByUserId(user.userId as string);

  if (!userData) return <p className="text-center py-8">Failed to fetch user data.</p>;
  
  // Transform MongoDB documents to expected Order type
  const orders: Order[] = mongoOrders ? mongoOrders.map(order => ({
    _id: order._id.toString(),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    items: Array.isArray(order.items) ? order.items : [],
    totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : 0,
    totalPoints: typeof order.totalPoints === 'number' ? order.totalPoints : 0,
    status: typeof order.status === 'string' ? order.status : 'pending'
  })) : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {/* User Information Section */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-md text-white">
        <h2 className="text-xl font-semibold mb-4">Your Information</h2>
        <p><span className="font-medium">Email:</span> {userData.email}</p>
        <p><span className="font-medium">Reward Points:</span> 
          <span className="text-amber-600 font-bold ml-2">{userData.points || 0} points</span>
        </p>
      </div>

      {/* Orders Section */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-md text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Orders</h2>
          {/* Connection status indicator for real-time updates */}
          <OrderStatusIndicatorWrapper />
        </div>
        
        {/* Use the client-side OrdersTable component with properly typed orders */}
        <OrdersTableWrapper initialOrders={orders} />
      </div>
    </div>
  );
} 