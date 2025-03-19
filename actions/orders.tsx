"use server"

import getAuthUser from "@/lib/getAuthUser";
import { FoodItem, foodItemExample, foodItemSchema, FoodOrder } from "@/lib/rules";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

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

