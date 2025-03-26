import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { sendEventToAdmins, sendEventToUser } from '@/actions/events';
import { ObjectId } from 'mongodb';

// Set Node.js runtime for this API route
export const runtime = 'nodejs';

// This is a long-polling endpoint that checks for new orders and order updates
export async function GET(request: NextRequest) {
  console.log('API: Order monitor requested');
  
  try {
    // Get the 'since' parameter (timestamp of last check)
    const urlParams = new URL(request.url).searchParams;
    const since = urlParams.get('since') || new Date(Date.now() - 60000).toISOString(); // Default to 1 minute ago
    const sinceDate = new Date(since);
    
    console.log(`API: Checking for orders since ${sinceDate.toISOString()}`);
    
    // Get orders created or updated since the last check
    const ordersCollection = await getCollection("orders");
    
    // Find recent orders
    const newOrders = await ordersCollection?.find({
      createdAt: { $gte: sinceDate },
      status: { $nin: ['completed', 'cancelled'] } // Only notify about active orders
    }).toArray();
    
    // Find updated orders (using the updatedAt field)
    const updatedOrders = await ordersCollection?.find({
      updatedAt: { $gte: sinceDate },
      createdAt: { $lt: sinceDate }, // Only get orders that weren't just created
      status: { $nin: ['completed', 'cancelled'] } // Only notify about active orders
    }).toArray();
    
    console.log(`API: Found ${newOrders?.length || 0} new orders and ${updatedOrders?.length || 0} updated orders`);
    
    // Process new orders
    if (newOrders && newOrders.length > 0) {
      for (const order of newOrders) {
        console.log(`API: Processing new order ${order._id}`);
        
        // Send to admin clients
        const serializedOrder = {
          ...order,
          _id: order._id.toString(),
          userId: order.userId ? order.userId.toString() : null,
          createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt
        };
        
        await sendEventToAdmins('new-order', {
          type: 'new-order',
          order: serializedOrder
        });
        
        // Send status notification to the user
        if (order.userId) {
          const userId = order.userId.toString();
          await sendEventToUser(userId, 'order-status-update', {
            orderId: order._id.toString(),
            oldStatus: '', // No old status for new orders
            newStatus: order.status || 'pending',
            updatedAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : 
                      (typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString()),
            userId
          });
        }
      }
    }
    
    // Process updated orders
    if (updatedOrders && updatedOrders.length > 0) {
      for (const order of updatedOrders) {
        console.log(`API: Processing updated order ${order._id} with status ${order.status}`);
        
        // Send to admin clients
        await sendEventToAdmins('order-update', {
          type: 'status-change',
          orderId: order._id.toString(),
          oldStatus: 'unknown', // We don't know the previous status
          newStatus: order.status,
          updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : 
                    (typeof order.updatedAt === 'string' ? order.updatedAt : new Date().toISOString())
        });
        
        // Send status notification to the user
        if (order.userId) {
          const userId = order.userId.toString();
          await sendEventToUser(userId, 'order-status-update', {
            orderId: order._id.toString(),
            oldStatus: 'unknown', // We don't know the previous status
            newStatus: order.status,
            updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : 
                      (typeof order.updatedAt === 'string' ? order.updatedAt : new Date().toISOString()),
            userId
          });
        }
      }
    }
    
    // Return the current time for the next poll
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      newOrders: newOrders?.length || 0,
      updatedOrders: updatedOrders?.length || 0
    });
    
  } catch (error) {
    console.error('API: Error in order monitor:', error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Add an interval endpoint to continuously check for changes
export async function POST(request: NextRequest) {
  console.log('API: Order monitor check requested');
  
  try {
    // Get the 'orderId' parameter if we're checking a specific order
    const data = await request.json();
    const { orderId } = data;
    
    if (orderId) {
      console.log(`API: Checking specific order ${orderId}`);
      
      // Check if the order exists and get its current status
      const ordersCollection = await getCollection("orders");
      const order = await ordersCollection?.findOne({ _id: new ObjectId(orderId) });
      
      if (!order) {
        return NextResponse.json({ 
          success: false, 
          error: "Order not found" 
        }, { status: 404 });
      }
      
      // Return the order's current status
      return NextResponse.json({
        success: true,
        orderId,
        status: order.status,
        updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : 
                  (typeof order.updatedAt === 'string' ? order.updatedAt : 
                   (order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date().toISOString()))
      });
    }
    
    // If no orderId, just return success to indicate the endpoint is working
    return NextResponse.json({
      success: true,
      message: "Order monitor is active"
    });
    
  } catch (error) {
    console.error('API: Error in order status check:', error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 