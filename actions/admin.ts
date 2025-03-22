'use server'

import { getCollection } from '@/lib/db';
import getAuthUser from '@/lib/getAuthUser';
import { ObjectId } from 'mongodb';
import { sendEventToUser } from '@/actions/events';
import { revalidatePath } from 'next/cache';

/**
 * Updates an order's status and optionally reduces inventory
 */
export async function updateOrderStatus(
  orderId: string, 
  status: string, 
  reduceInventory: boolean
) {
  try {
    // Check if user is authenticated and is an admin
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Verify admin status
    const usersCollection = await getCollection("users");
    const userData = await usersCollection?.findOne({ 
      _id: ObjectId.createFromHexString(authUser.userId as string) 
    });
    
    if (!userData || !userData.isAdmin) {
      return { success: false, error: "Access denied. Admin privileges required." };
    }
    
    // First, get the order details to know which user to notify
    const ordersCollection = await getCollection("orders");
    const order = await ordersCollection?.findOne({ _id: new ObjectId(orderId) });
    
    if (!order) {
      return { success: false, error: "Order not found" };
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
      { _id: new ObjectId(orderId) },
      { $set: { status } }
    );
    
    if (result?.matchedCount === 0) {
      return { success: false, error: "Order not found" };
    }
    
    // Notify the user of the status change if this order belongs to a user
    // and if the status has actually changed
    if (order.userId && status !== oldStatus) {
      const userId = order.userId.toString();
      try {
        // Send status update event to the user
        await sendEventToUser(userId, 'order-status-update', {
          orderId,
          oldStatus,
          newStatus: status,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`Notified user ${userId} about order ${orderId} status change to ${status}`);
      } catch (notifyError) {
        console.error(`Error notifying user ${userId}:`, notifyError);
        // Continue even if notification fails
      }
    }
    
    // Revalidate the admin orders page and the specific order page
    revalidatePath('/admin');
    revalidatePath(`/admin/orders/${orderId}`);
    
    return { 
      success: true,
      message: "Order status updated successfully"
    };
    
  } catch (error) {
    console.error("Error updating order status:", error);
    return { 
      success: false, 
      error: "An error occurred while updating the order" 
    };
  }
}

/**
 * Gets all orders for admin users
 */
export async function getAdminOrders() {
  try {
    // Check if user is authenticated and is an admin
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return { 
        success: false, 
        error: "Unauthorized" 
      };
    }
    
    // Verify admin status
    const usersCollection = await getCollection("users");
    const userData = await usersCollection?.findOne({ 
      _id: ObjectId.createFromHexString(authUser.userId as string) 
    });
    
    if (!userData || !userData.isAdmin) {
      return { 
        success: false, 
        error: "Access denied. Admin privileges required." 
      };
    }
    
    // Fetch all orders for the admin
    const ordersCollection = await getCollection("orders");
    const orders = await ordersCollection?.find({}).toArray();
    
    // Transform MongoDB documents to ensure they match the expected Order type structure
    const serializedOrders = orders ? orders.map(order => ({
      _id: order._id.toString(),
      userId: order.userId ? order.userId.toString() : null,
      items: Array.isArray(order.items) ? order.items : [],
      totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : 0,
      totalPoints: typeof order.totalPoints === 'number' ? order.totalPoints : 0,
      status: typeof order.status === 'string' ? order.status : 'pending',
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : 
                 typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString(),
      customerInfo: order.customerInfo || { name: '', email: '', address: '' },
    })) : [];
    
    return { 
      success: true, 
      orders: serializedOrders 
    };
    
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return { 
      success: false, 
      error: "An error occurred while fetching orders" 
    };
  }
} 