import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { sendEventToAdmins, sendEventToUser } from '@/actions/events';

// Set Node.js runtime for this API route
export const runtime = 'nodejs';

// This endpoint is designed to be called by a scheduled task 
// (e.g., cron job or external service) to keep the SSE system working

export async function GET(request: NextRequest) {
  console.log('API: Order polling service triggered');
  
  try {
    // Get the 'since' parameter (timestamp of last check)
    const urlParams = new URL(request.url).searchParams;
    const minutes = parseInt(urlParams.get('minutes') || '5');
    const sinceDate = new Date(Date.now() - minutes * 60 * 1000); // Default to 5 minutes ago
    
    console.log(`API: Checking for order updates since ${sinceDate.toISOString()}`);
    
    // Get active orders from MongoDB
    const ordersCollection = await getCollection("orders");
    
    // Get new orders
    const newOrders = await ordersCollection?.find({
      createdAt: { $gte: sinceDate }
    }).toArray();
    
    // Get updated orders
    const updatedOrders = await ordersCollection?.find({
      updatedAt: { $gte: sinceDate },
      createdAt: { $lt: sinceDate }
    }).toArray();
    
    console.log(`API: Found ${newOrders?.length || 0} new orders and ${updatedOrders?.length || 0} updated orders`);
    
    let processedCount = 0;
    
    // Process new orders
    if (newOrders && newOrders.length > 0) {
      for (const order of newOrders) {
        try {
          // Notify admins
          await sendEventToAdmins('new-order', {
            type: 'new-order',
            order: {
              ...order,
              _id: order._id.toString(),
              userId: order.userId ? order.userId.toString() : null
            }
          });
          
          // Notify user
          if (order.userId) {
            await sendEventToUser(order.userId.toString(), 'order-status-update', {
              orderId: order._id.toString(),
              oldStatus: '',
              newStatus: order.status || 'pending',
              updatedAt: new Date().toISOString(),
              userId: order.userId.toString()
            });
          }
          
          processedCount++;
        } catch (error) {
          console.error(`API: Error processing new order ${order._id}:`, error);
        }
      }
    }
    
    // Process updated orders
    if (updatedOrders && updatedOrders.length > 0) {
      for (const order of updatedOrders) {
        try {
          // Notify admins
          await sendEventToAdmins('order-update', {
            type: 'status-change',
            orderId: order._id.toString(),
            oldStatus: 'unknown', // We don't track previous status in this simplified implementation
            newStatus: order.status,
            updatedAt: new Date().toISOString()
          });
          
          // Notify user
          if (order.userId) {
            await sendEventToUser(order.userId.toString(), 'order-status-update', {
              orderId: order._id.toString(),
              oldStatus: 'unknown',
              newStatus: order.status,
              updatedAt: new Date().toISOString(),
              userId: order.userId.toString()
            });
          }
          
          processedCount++;
        } catch (error) {
          console.error(`API: Error processing updated order ${order._id}:`, error);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      newOrders: newOrders?.length || 0,
      updatedOrders: updatedOrders?.length || 0,
      processedCount
    });
    
  } catch (error) {
    console.error('API: Error in order poll service:', error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 