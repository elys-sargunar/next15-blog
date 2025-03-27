'use server'

import { getCollection } from '@/lib/db';
import getAuthUser from '@/lib/getAuthUser';
import { ObjectId } from 'mongodb';
import { broadcastOrderStatusUpdate } from '@/actions/events';
import { revalidatePath } from 'next/cache';
import { sendEventToAdmins } from '@/actions/events';

/**
 * Updates an order's status and optionally reduces inventory
 */
export async function updateOrderStatus(
  orderId: string, 
  status: string, 
  reduceInventory: boolean
) {
  try {
    console.log(`ADMIN: Starting updateOrderStatus for order ${orderId} -> ${status}`);
    
    // Check if user is authenticated and is an admin
    const authUser = await getAuthUser();
    
    if (!authUser) {
      console.log(`ADMIN: Authentication failed for updateOrderStatus`);
      return { success: false, error: "Unauthorized" };
    }
    
    // Verify admin status
    const usersCollection = await getCollection("users");
    const userData = await usersCollection?.findOne({ 
      _id: ObjectId.createFromHexString(authUser.userId as string) 
    });
    
    if (!userData || !userData.isAdmin) {
      console.log(`ADMIN: Admin verification failed for user ${authUser.userId}`);
      return { success: false, error: "Access denied. Admin privileges required." };
    }
    
    // First, get the order details to know which user to notify
    const ordersCollection = await getCollection("orders");
    const order = await ordersCollection?.findOne({ _id: new ObjectId(orderId) });
    
    if (!order) {
      console.log(`ADMIN: Order ${orderId} not found`);
      return { success: false, error: "Order not found" };
    }
    
    console.log(`ADMIN: Found order ${orderId}, user: ${order.userId ? order.userId.toString() : 'none'}`);
    
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
      { $set: { 
        status,
        lastUpdated: new Date() // Add lastUpdated timestamp when status changes
      }}
    );
    
    if (result?.matchedCount === 0) {
      console.log(`ADMIN: Failed to update order ${orderId} - not found`);
      return { success: false, error: "Order not found" };
    }
    
    console.log(`ADMIN: Successfully updated order ${orderId} from ${oldStatus} to ${status}`);
    
    // Check if status has actually changed
    if (status !== oldStatus) {
      try {
        console.log(`ADMIN: Status changed, sending notifications...`);
        
        // Add points to user account if status changed to "completed"
        if (status === "completed" && order.userId) {
          try {
            // First, ensure we have a valid points value
            const pointsToAdd = typeof order.totalPoints === 'number' ? Math.floor(order.totalPoints) : 
                                typeof order.pointsEarned === 'number' ? Math.floor(order.pointsEarned) : 0;
            
            if (pointsToAdd > 0) {
              console.log(`ADMIN: Adding ${pointsToAdd} points to user ${order.userId}`);
              
              // Convert userId to ObjectId if it's a string
              const userObjectId = typeof order.userId === 'string' ? 
                                   new ObjectId(order.userId) : order.userId;
              
              // Update the user's points in the database
              const updateResult = await usersCollection?.updateOne(
                { _id: userObjectId },
                { $inc: { points: pointsToAdd } }
              );
              
              if (updateResult?.modifiedCount === 1) {
                console.log(`ADMIN: Successfully added ${pointsToAdd} points to user ${order.userId}`);
              } else {
                console.error(`ADMIN: Failed to add points to user ${order.userId}`);
              }
            } else {
              console.log(`ADMIN: No points to add for order ${orderId} (value: ${pointsToAdd})`);
            }
          } catch (pointsError) {
            console.error(`ADMIN: Error adding points to user:`, pointsError);
            // Continue even if points update fails
          }
        }
        
        // 1. First notify all admins about the status change
        console.log(`ADMIN: Notifying all admin clients...`);
        await sendEventToAdmins('order-update', {
          type: 'status-change',
          orderId,
          oldStatus,
          newStatus: status,
          updatedAt: new Date().toISOString(),
          updatedBy: authUser.userId
        });
        
        console.log(`ADMIN: Notified all admins about order ${orderId} status change to ${status}`);
        
        // 2. Then notify the user if order has userId (no more guest orders)
        if (order.userId) {
          // Ensure we have a string userId to use for notification
          const userId = order.userId.toString();
          
          console.log(`ADMIN: Notifying user ${userId} about order ${orderId}...`);
          await broadcastOrderStatusUpdate(
            userId,
            orderId,
            oldStatus,
            status
          );
          
          console.log(`ADMIN: Successfully notified user ${userId} about their order ${orderId} status change to ${status}`);
        } else {
          console.log(`ADMIN: Order ${orderId} has no userId associated, skipping user notification`);
        }
        
      } catch (notifyError) {
        console.error(`ADMIN: Error broadcasting status update:`, notifyError);
        // Continue even if notification fails
      }
    } else {
      console.log(`ADMIN: Status unchanged (${status}), skipping notifications`);
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
    // Sort orders by createdAt in descending order (newest first)
    const orders = await ordersCollection?.find({}).sort({ createdAt: -1 }).toArray();
    
    // Transform MongoDB documents to ensure they match the expected Order type structure
    const serializedOrders = orders ? orders.map(order => ({
      _id: order._id.toString(),
      userId: order.userId ? order.userId.toString() : null,
      userEmail: order.userEmail || '',
      userName: order.userName || '',
      items: order.items || [],
      totalPrice: typeof order.totalPrice === 'number' ? order.totalPrice : 
                  typeof order.total === 'number' ? order.total : 0,
      totalPoints: typeof order.totalPoints === 'number' ? Math.floor(order.totalPoints) : 
                   typeof order.pointsEarned === 'number' ? Math.floor(order.pointsEarned) : 0,
      status: order.status || 'pending',
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : 
                (typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString()),
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : 
                (typeof order.updatedAt === 'string' ? order.updatedAt : order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date().toISOString()),
      lastUpdated: order.lastUpdated instanceof Date ? order.lastUpdated.toISOString() : 
                  (typeof order.lastUpdated === 'string' ? order.lastUpdated : 
                   order.updatedAt instanceof Date ? order.updatedAt.toISOString() : 
                   order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date().toISOString())
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

/**
 * Normalizes order data in the database to ensure consistent field names and types
 */
export async function normalizeOrderPoints() {
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
    
    // Get all orders that need normalization (those with pointsEarned but no totalPoints)
    const ordersCollection = await getCollection("orders");
    const orders = await ordersCollection?.find({
      $or: [
        { pointsEarned: { $exists: true } },
        { totalPoints: { $exists: false } }
      ]
    }).toArray();
    
    if (!orders || orders.length === 0) {
      return { success: true, message: "No orders need normalization.", count: 0 };
    }
    
    let normalizedCount = 0;
    
    // Process each order
    for (const order of orders) {
      // Calculate points from items if available
      let calculatedPoints = 0;
      
      if (Array.isArray(order.items)) {
        calculatedPoints = order.items.reduce((sum, item) => {
          const itemPoints = typeof item.points === 'number' ? Math.floor(item.points) : 0;
          const quantity = typeof item.quantity === 'number' ? Math.floor(item.quantity) : 1;
          return sum + (itemPoints * quantity);
        }, 0);
      }
      
      // Determine the best points value to use
      let pointsValue = 0;
      
      if (typeof order.totalPoints === 'number' && !isNaN(order.totalPoints)) {
        pointsValue = Math.floor(order.totalPoints);
      } else if (typeof order.pointsEarned === 'number' && !isNaN(order.pointsEarned)) {
        pointsValue = Math.floor(order.pointsEarned);
      } else if (calculatedPoints > 0) {
        pointsValue = calculatedPoints;
      }
      
      // Update the order in the database
      const updateResult = await ordersCollection?.updateOne(
        { _id: order._id },
        { 
          $set: { totalPoints: pointsValue },
          $unset: { pointsEarned: "" } // Remove the old field
        }
      );
      
      if (updateResult?.modifiedCount === 1) {
        normalizedCount++;
      }
    }
    
    return { 
      success: true, 
      message: `Successfully normalized ${normalizedCount} orders.`,
      count: normalizedCount
    };
    
  } catch (error) {
    console.error("Error normalizing orders:", error);
    return { 
      success: false, 
      error: "An error occurred while normalizing orders" 
    };
  }
} 