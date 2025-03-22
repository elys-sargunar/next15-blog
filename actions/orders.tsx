"use server"

import getAuthUser from "@/lib/getAuthUser";
import { FoodItem, foodItemExample, foodItemSchema, FoodOrder } from "@/lib/rules";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

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
export async function placeOrder(orderData: PlaceOrderRequest): Promise<OrderResponse> {
  try {
    // Get the authenticated user (optional)
    const authUser = await getAuthUser();
    
    // Access the orders collection
    const ordersCollection = await getCollection("orders");
    if (!ordersCollection) {
      return {
        success: false,
        error: "Failed to connect to orders collection"
      };
    }
    
    // Calculate total points from order items
    const totalPoints = orderData.items.reduce((sum: number, item: OrderItem) => {
      const itemPoints = item.points || 0;
      return sum + (itemPoints * item.quantity);
    }, 0);
    
    // Prepare the order document
    const orderDoc = {
      items: orderData.items,
      totalPrice: orderData.totalPrice,
      totalPoints: totalPoints,
      userId: authUser ? ObjectId.createFromHexString(authUser.userId as string) : null,
      status: "pending",
      createdAt: new Date(),
      customerInfo: orderData.customerInfo || {},
    };
    
    // Insert the order into the collection
    const result = await ordersCollection.insertOne(orderDoc);
    
    // If user is authenticated, update their points
    if (authUser) {
      const usersCollection = await getCollection("users");
      if (usersCollection) {
        await usersCollection.updateOne(
          { _id: ObjectId.createFromHexString(authUser.userId as string) },
          { $inc: { points: totalPoints } }
        );
      }
    }
    
    if (result.acknowledged) {
      // Get the new order ID
      const newOrderId = result.insertedId.toString();
      
      // Create serialized order for sending via SSE
      const serializedOrder = {
        ...orderDoc,
        _id: newOrderId,
        userId: orderDoc.userId ? orderDoc.userId.toString() : null,
        createdAt: orderDoc.createdAt.toISOString()
      };
      
      // Use dynamic import to avoid circular dependency
      const { sendEventToAdmins } = await import('@/actions/events');
      
      // Notify all connected admin clients about the new order
      await sendEventToAdmins('new-order', {
        order: serializedOrder
      });
      
      // Revalidate relevant paths
      revalidatePath('/my-orders');
      revalidatePath('/admin');
      
      return {
        success: true,
        orderId: newOrderId,
        totalPoints: totalPoints,
        message: "Order placed successfully"
      };
    } else {
      return {
        success: false,
        error: "Failed to save order"
      };
    }
  } catch (error) {
    console.error("Error placing order:", error);
    return {
      success: false,
      error: "An error occurred while placing your order"
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
    const ordersCollection = await getCollection("orders")
    const orders = await ordersCollection?.find({userId: new ObjectId(userId)}).toArray()
    return orders
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

