import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import getAuthUser from '@/lib/getAuthUser';
import { getOrdersByUserId } from '@/actions/orders';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Check if user is authenticated
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Fetch user data and orders in parallel
    const usersCollection = await getCollection("users");
    
    const userData = await usersCollection?.findOne({ 
      _id: ObjectId.createFromHexString(authUser.userId as string) 
    });
    
    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Fetch orders for this user
    const orders = await getOrdersByUserId(authUser.userId as string);
    
    // Return combined profile data
    return NextResponse.json({
      user: {
        userId: authUser.userId,
      },
      userData: {
        email: userData.email,
        points: userData.points || 0,
        isAdmin: userData.isAdmin,
        // Include other user data fields as needed
      },
      orders: orders ? orders.map(order => ({
        ...order,
        _id: order._id.toString(),
        // Handle potential ObjectId types in nested objects
        userId: order.userId ? order.userId.toString() : null
      })) : []
    });
    
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching the user profile" },
      { status: 500 }
    );
  }
} 