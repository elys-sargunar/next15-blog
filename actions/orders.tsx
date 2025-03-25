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
  'use server';
  
  console.log("SERVER: Starting placeOrder function");
  
  try {
    // Check if user is authenticated
    const authUser = await getAuthUser();
    console.log(`SERVER: User authentication check: ${authUser ? 'Authenticated' : 'Not authenticated'}`);
    
    if (!authUser) {
      console.log("SERVER: Order placement rejected - user not authenticated");
      return { error: "You must be logged in to place an order." };
    }
    
    // Get user data from database
    const usersCollection = await getCollection("users");
    const userData = await usersCollection?.findOne({ 
      _id: ObjectId.createFromHexString(authUser.userId as string) 
    });
    console.log(`SERVER: Retrieved user data for ${authUser.userId}`);

    // Parse form data
    const cartItems = JSON.parse(formData.get('cartItems') as string);
    const subTotal = parseFloat(formData.get('subTotal') as string);
    const tax = parseFloat(formData.get('tax') as string);
    const total = parseFloat(formData.get('total') as string);
    const pointsEarned = parseInt(formData.get('pointsEarned') as string);
    
    console.log(`SERVER: Parsed order data - ${cartItems.length} items, total: ${total}, points: ${pointsEarned}`);

    // Create order object
    const order = {
      userId: authUser.userId,
      userEmail: userData?.email || '',
      userName: userData?.name || '',
      items: cartItems,
      subTotal,
      tax,
      total,
      pointsEarned,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("SERVER: Order object created, attempting database insert");

    // Insert into database
    const collection = await getCollection("orders");
    const result = await collection?.insertOne(order);
    
    if (!result?.insertedId) {
      console.error("SERVER: Failed to insert order into database");
      return { error: "Failed to create order. Please try again." };
    }
    
    // Get the inserted order with its ID
    const orderWithId = {
      ...order,
      _id: result.insertedId
    };
    
    console.log(`SERVER: Order successfully created with ID ${result.insertedId}`);
    
    // Notify admin clients about the new order
    console.log("SERVER: Attempting to notify admin clients about new order");
    try {
      await sendEventToAdmins("new-order", {
        type: "new-order",
        order: orderWithId
      });
      console.log("SERVER: Successfully sent new order notification to admins");
    } catch (notifyError) {
      console.error("SERVER: Failed to notify admins about new order:", notifyError);
      // Continue even if notification fails
    }
    
    // Send confirmation to the user
    console.log(`SERVER: Attempting to notify user ${authUser.userId} about their new order`);
    try {
      await broadcastOrderStatusUpdate(
        authUser.userId as string,
        result.insertedId.toString(),
        "",  // No previous status for new order
        "pending"  // Initial status
      );
      console.log(`SERVER: Successfully sent order confirmation to user ${authUser.userId}`);
    } catch (userNotifyError) {
      console.error("SERVER: Failed to notify user about new order:", userNotifyError);
      // Continue even if notification fails
    }
    
    // Revalidate paths
    revalidatePath('/my-orders');
    revalidatePath('/order');
    
    console.log("SERVER: Order placement complete, returning success");
    
    // Return success with the created order
    return {
      success: true,
      message: "Order placed successfully!",
      order: orderWithId
    };
  } catch (error) {
    console.error("SERVER: Error in placeOrder function:", error);
    return {
      error: "An unexpected error occurred. Please try again."
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

