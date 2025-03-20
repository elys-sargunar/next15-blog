import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import getAuthUser from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Get the authenticated user (optional)
    const authUser = await getAuthUser();
    
    // Access the orders collection
    const ordersCollection = await getCollection("orders");
    if (!ordersCollection) {
      return NextResponse.json(
        { error: "Failed to connect to orders collection" },
        { status: 500 }
      );
    }
    
    // Calculate total points from order items
    const totalPoints = body.items.reduce((sum: number, item: any) => {
      const itemPoints = item.points || 0;
      return sum + (itemPoints * item.quantity);
    }, 0);
    
    // Prepare the order document
    const orderDoc = {
      items: body.items,
      totalPrice: body.totalPrice,
      totalPoints: totalPoints,
      userId: authUser ? ObjectId.createFromHexString(authUser.userId as string) : null,
      status: "pending",
      createdAt: new Date(),
      customerInfo: body.customerInfo || {},
    };
    
    // Insert the order into the collection
    const result = await ordersCollection.insertOne(orderDoc);
    
    // If user is authenticated, update their points
    if (authUser) {
      const usersCollection = await getCollection("users");
      if (usersCollection) {
        await usersCollection.updateOne(
          { _id: ObjectId.createFromHexString(authUser.userId as string) },
          { $inc: { points: totalPoints } }
        );
      }
    }
    
    if (result.acknowledged) {
      return NextResponse.json({
        success: true,
        orderId: result.insertedId.toString(),
        totalPoints: totalPoints,
        message: "Order placed successfully"
      });
    } else {
      return NextResponse.json(
        { error: "Failed to save order" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error placing order:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your order" },
      { status: 500 }
    );
  }
} 