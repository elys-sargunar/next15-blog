import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import getAuthUser from '@/lib/getAuthUser';
import { ObjectId } from 'mongodb';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { status } = await request.json();
    
    // Check if user is authenticated and is an admin
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Verify admin status
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
    
    // Update the order status
    const ordersCollection = await getCollection("orders");
    const result = await ordersCollection?.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    
    if (result?.matchedCount === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Order status updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "An error occurred while updating the order" },
      { status: 500 }
    );
  }
} 