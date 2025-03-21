import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import getAuthUser from '@/lib/getAuthUser';
import { ObjectId } from 'mongodb';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Check if user is authenticated and is an admin
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Fetch user data to verify admin status
    const usersCollection = await getCollection("users");
    const userData = await usersCollection?.findOne({ 
      _id: ObjectId.createFromHexString(authUser.userId as string) 
    });
    
    if (!userData || !userData.isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }
    
    // Fetch all orders for the admin
    const ordersCollection = await getCollection("orders");
    const orders = await ordersCollection?.find({}).toArray();
    
    // Transform MongoDB ObjectIDs to strings for JSON serialization
    const serializedOrders = orders ? orders.map(order => ({
      ...order,
      _id: order._id.toString(),
      userId: order.userId ? order.userId.toString() : null
    })) : [];
    
    return NextResponse.json({ orders: serializedOrders });
    
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching orders" },
      { status: 500 }
    );
  }
} 