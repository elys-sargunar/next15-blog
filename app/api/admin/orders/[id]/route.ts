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
    
    // If we need to reduce inventory (changing to "accepted" status)
    if (reduceInventory) {
      try {
        // First, get the order details to know which items to reduce
        const ordersCollection = await getCollection("orders");
        const order = await ordersCollection?.findOne({ _id: new ObjectId(id) });
        
        if (!order || !order.items || !Array.isArray(order.items)) {
          console.error("Could not find order or order has no items");
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