import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Check if ID is valid
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }
    
    // Access the orders collection
    const ordersCollection = await getCollection("orders");
    if (!ordersCollection) {
      return NextResponse.json(
        { error: "Failed to connect to orders collection" },
        { status: 500 }
      );
    }
    
    // Find the order by ID
    const order = await ordersCollection.findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }
    
    // Return the order data
    return NextResponse.json({
      order: {
        ...order,
        _id: order._id.toString(),
        userId: order.userId ? order.userId.toString() : null
      }
    });
    
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching the order" },
      { status: 500 }
    );
  }
} 