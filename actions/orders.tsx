"use server"

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FoodItem, foodItemExample, foodItemSchema, FoodOrder } from "@/lib/rules";
import { getCollection } from "@/lib/db";
import { sendEventToAdmins, broadcastOrderStatusUpdate } from "@/actions/events";
import getAuthUser from "@/lib/getAuthUser";

// Define type for cart item
interface CartItem {
  item: {
    _id: string | { toString(): string };
    name: string;
    price: number;
    points: number;
  };
  quantity: number;
}

// Define type for order item
interface OrderItem {
  id: string;
  name: string;
  price: number;
  points: number;
  quantity: number;
}

// Define type for customer info
interface CustomerInfo {
  name: string;
  email: string;
  address: string;
}

// Define type for place order request
interface PlaceOrderRequest {
  items: OrderItem[];
  totalPrice: number;
  customerInfo: CustomerInfo;
}

// Define type for order response
interface OrderResponse {
  success: boolean;
  orderId?: string;
  totalPoints?: number;
  message?: string;
  error?: string;
}

/**
 * Places a new order
 */
export async function placeOrder(formData: FormData) {
  try {
    // Get the authenticated user
    const authUser = await getAuthUser();
    
    // Reject orders from unauthenticated users
    if (!authUser || !authUser.userId) {
      return {
        success: false,
        message: "You must be logged in to place an order"
      };
    }
    
    // Parse the form data
    const cartItems = JSON.parse(formData.get('cartItems') as string);
    const totalPrice = parseInt(formData.get('totalPrice') as string);
    const totalPoints = parseInt(formData.get('totalPoints') as string);
    
    // Create order document with required userId
    const order = {
      userId: ObjectId.createFromHexString(authUser.userId as string), // Convert string ID to ObjectId
      userEmail: formData.get('email') || null,
      items: cartItems,
      totalPrice,
      totalPoints,
      status: 'pending',
      createdAt: new Date(),
      lastUpdated: new Date(), // Add lastUpdated field for sorting
    };
    
    // Insert order into db
    const ordersCollection = await getCollection("orders");
    if (!ordersCollection) {
      throw new Error("Failed to connect to database");
    }
    
    const result = await ordersCollection.insertOne(order);
    
    if (result.acknowledged) {
      console.log(`ORDERS: New order created with ID ${result.insertedId}`);
      
      // Send notification to all connected admin clients about the new order
      try {
        console.log(`ORDERS: Broadcasting new order notification to admins`);
        
        // Create a serialized order object for the event
        const serializedOrder = {
          _id: result.insertedId.toString(),
          userId: authUser.userId?.toString(),
          userEmail: order.userEmail,
          items: order.items,
          totalPrice: order.totalPrice,
          totalPoints: order.totalPoints,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          lastUpdated: order.lastUpdated.toISOString()
        };
        
        // Notify admins with full order details
        await sendEventToAdmins("new-order", { order: serializedOrder });
        console.log(`ORDERS: Successfully sent admin notifications for new order ${result.insertedId}`);
      } catch (notifyError) {
        console.error(`ORDERS: Error notifying admins about new order:`, notifyError);
        // Continue even if admin notification fails
      }
      
      // Notify the user about their new order
      try {
        console.log(`ORDERS: Sending order confirmation to user ${authUser.userId}`);
        await broadcastOrderStatusUpdate(
          authUser.userId as string, 
          result.insertedId.toString(),
          "", // No old status for new orders
          "pending" // Initial status is pending
        );
        console.log(`ORDERS: Successfully sent order confirmation to user ${authUser.userId}`);
      } catch (userNotifyError) {
        console.error(`ORDERS: Error notifying user about new order:`, userNotifyError);
        // Continue even if user notification fails
      }
      
      // Revalidate relevant paths
      revalidatePath('/my-orders');
      revalidatePath('/admin');
      
      return {
        success: true,
        message: "Order placed successfully",
        orderId: result.insertedId.toString()
      };
    } else {
      throw new Error("Failed to place order");
    }
  } catch (error) {
    console.error("Error placing order:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unknown error occurred"
    };
  }
}

/**
 * Gets a specific order by ID
 */
export async function fetchOrderById(id: string) {
  try {
    // Check if ID is valid
    if (!id || !ObjectId.isValid(id)) {
      return {
        success: false,
        error: "Invalid order ID"
      };
    }
    
    // Access the orders collection
    const ordersCollection = await getCollection("orders");
    if (!ordersCollection) {
      return {
        success: false,
        error: "Failed to connect to orders collection"
      };
    }
    
    // Find the order by ID
    const order = await ordersCollection.findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!order) {
      return {
        success: false,
        error: "Order not found"
      };
    }
    
    // Return the order data with proper serialization to match the client's Order type
    return {
      success: true,
      order: {
        // Include all original fields first
        ...JSON.parse(JSON.stringify(order)),
        // Then override with properly formatted fields
        _id: order._id.toString(),
        userId: order.userId ? order.userId.toString() : null,
        createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
        items: order.items || [],
        totalPrice: order.totalPrice || 0,
        totalPoints: order.totalPoints || 0,
        status: order.status || 'pending',
      }
    };
    
  } catch (error) {
    console.error("Error fetching order:", error);
    return {
      success: false,
      error: "An error occurred while fetching the order"
    };
  }
}

export async function createOrder(state: { errors?: any, name: string, tableNumber?: number, items?: any }, formData: FormData){

    // Check if the user is signed in
    const user = await getAuthUser()
    if(!user){
        return redirect("/login"); 
    }

    // Validate order form fields
    const name = formData.get("name");
    const tableNumber = formData.get("tableNumber");
    const items = formData.get("items");

    const validatedFields = foodItemSchema.safeParse({
        name, tableNumber, items
    })

    // If any form fields are invalid
    if(!validatedFields.success){
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            name, tableNumber, items
        }
    }

    // Save new post to DB.
    try {
        const ordersCollection = await getCollection("orders");
        const order = {
            name: validatedFields.data.name,
            description: validatedFields.data.description,
            price: validatedFields.data.price,
            nutritionalInfo: validatedFields.data.nutritionalInfo,
            allergies: validatedFields.data.allergies,
            supplier: validatedFields.data.supplier,
            available: validatedFields.data.available,
            menuCategory: validatedFields.data.menuCategory,
            userId: ObjectId.createFromHexString(user.userId as string)
        }
        await ordersCollection?.insertOne(order)
        console.log(order.userId)
    }
    catch(error: unknown) {
        return {
            errors: {name: error instanceof Error ? error.message : "An unknown error occurred"}
        };
    }

    redirect("/dashboard")
}

export async function getOrders(){
    const ordersCollection = await getCollection("orders")
    const orders = await ordersCollection?.find({}).toArray()
    return orders
}

export async function getOrderById(id: string){
    const ordersCollection = await getCollection("orders")
    const order = await ordersCollection?.findOne({_id: new ObjectId(id)})
    return order
}

export async function updateOrder(id: string, order: FoodOrder){
    const ordersCollection = await getCollection("orders")
    const updatedOrder = await ordersCollection?.updateOne({_id: new ObjectId(id)}, {$set: order})
    return updatedOrder
}

export async function deleteOrder(id: string){
    const ordersCollection = await getCollection("orders")
    const deletedOrder = await ordersCollection?.deleteOne({_id: new ObjectId(id)})
    return deletedOrder
}

export async function getOrdersByUserId(userId: string){
    const ordersCollection = await getCollection("orders");
    
    // Find orders and sort by createdAt in descending order (newest first)
    const orders = await ordersCollection?.find(
        {userId: new ObjectId(userId)}
    )
    .sort({ createdAt: -1 }) // Sort newest first
    .toArray();
    
    return orders;
}   

export async function getOrdersByTableNumber(tableNumber: number){
    const ordersCollection = await getCollection("orders")
    const orders = await ordersCollection?.find({tableNumber: tableNumber}).toArray()
    return orders
}   

export async function getOrdersByOrderId(orderId: string){
    const ordersCollection = await getCollection("orders")
    const order = await ordersCollection?.findOne({orderId: orderId})
    return order
}   

export async function getOrdersByOrderStatus(orderStatus: string){
    const ordersCollection = await getCollection("orders")
    const orders = await ordersCollection?.find({orderStatus: orderStatus}).toArray()
    return orders
}   


export async function getOrdersByOrderDate(orderDate: Date){
    const ordersCollection = await getCollection("orders")
    const orders = await ordersCollection?.find({orderDate: orderDate}).toArray()
    return orders
}   

export async function getOrdersByOrderTotalPrice(orderTotalPrice: number){
    const ordersCollection = await getCollection("orders")
    const orders = await ordersCollection?.find({orderTotalPrice: orderTotalPrice}).toArray()
    return orders
}     

