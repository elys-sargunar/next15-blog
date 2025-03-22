import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import getAuthUser from '@/lib/getAuthUser';
import { ObjectId } from 'mongodb';
import { sendEventToUser } from '../../../orders/status-events/route';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

// Based directly on Next.js documentation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the order ID from the URL parameters
  const id = params.id;
  
  try {
    // Parse the request body
    const { status, reduceInventory } = await request.json();
    
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
    
    // First, get the order details to know which user to notify
    const ordersCollection = await getCollection("orders");
    const order = await ordersCollection?.findOne({ _id: new ObjectId(id) });
    
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }
    
    // Store the old status to check if it's actually changing
    const oldStatus = order.status || "pending";
    
    // If we need to reduce inventory (changing to "accepted" status)
    if (reduceInventory) {
      try {
        if (!order.items || !Array.isArray(order.items)) {
          console.error("Could not find order items");
        } else {
          // Get the menu items collection
          const menuItemCollection = await getCollection("menuItems");
          
          // For each item in the order, reduce its quantity in inventory
          for (const item of order.items) {
            if (!item.id) continue;
            
            try {
              // Update the menu item quantity
              await menuItemCollection?.updateOne(
                { _id: new ObjectId(item.id) },
                { $inc: { quantity: -item.quantity } }
              );
              
              console.log(`Reduced quantity for item ${item.id} by ${item.quantity}`);
            } catch (itemError) {
              console.error(`Error reducing quantity for item ${item.id}:`, itemError);
            }
          }
        }
      } catch (inventoryError) {
        console.error("Error reducing inventory:", inventoryError);
        // Continue with status update even if inventory reduction fails
      }
    }
    
    // Update the order status
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
    
    // Notify the user of the status change if this order belongs to a user
    // and if the status has actually changed
    if (order.userId && status !== oldStatus) {
      const userId = order.userId.toString();
      try {
        // Send status update event to the user
        await sendEventToUser(userId, 'order-status-update', {
          orderId: id,
          oldStatus,
          newStatus: status,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`Notified user ${userId} about order ${id} status change to ${status}`);
      } catch (notifyError) {
        console.error(`Error notifying user ${userId}:`, notifyError);
        // Continue even if notification fails
      }
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