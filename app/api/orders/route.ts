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
    
    // Prepare the order document
    const orderDoc = {
      items: body.items,
      totalPrice: body.totalPrice,
      userId: authUser ? ObjectId.createFromHexString(authUser.userId) : null,
      status: "pending",
      createdAt: new Date(),
      customerInfo: body.customerInfo || {},
    };
    
    // Insert the order into the collection
    const result = await ordersCollection.insertOne(orderDoc);
    
    if (result.acknowledged) {
      return NextResponse.json({
        success: true,
        orderId: result.insertedId.toString(),
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