"use server"

import { getCollection, isValidPassword } from "@/lib/db";
import { LoginFormSchema, RegisterFormSchema } from "@/lib/rules";
import { hashPassword} from "@/lib/db"
import { redirect } from "next/navigation";
import { createSession } from "@/lib/sessions";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getOrdersByUserId } from "@/actions/orders";
import getAuthUser from "@/lib/getAuthUser";


export async function register(state:any, formData:any){

    // Validate the form fields
    const validatedFields = RegisterFormSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
    })

    // Check if the above fails
    if(!validatedFields.success){
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            email: formData.get("email"),
            password: formData.get("password"),
        }
    }

    // Extract form field values
    const {email, password} = validatedFields.data

    // Check if email is already registered
    const userCollection = await getCollection("users")

    if(!userCollection) return {errors: {email: "Server error"}}

    const existingUser = await userCollection.findOne({email})
    if(existingUser){
        return {errors: {email: "Email already exists."}}
    }    

    // Process the password field by hashing password
    const hashedPassword = await hashPassword(password);

    // Save user to database
    const results = await userCollection?.insertOne({
        email, 
        password: hashedPassword,
        isAdmin: false, // Default new users to non-admin
    })

    // Create a session for user
    await createSession(results.insertedId.toString())

    // Redirect
    redirect("/dashboard");

    // console.log(validatedFields.data);
    // console.log(userCollection);
    console.log(results);    
}

export async function login(state:any, formData:any){

    // Validate form fields
    const validatedFields = LoginFormSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password")
    })

    // If any form fields are invalid
    if(!validatedFields.success){
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            email: formData.get("email")
        }
    }

    // Extract validate data from valid form fields
    const {email, password} = validatedFields.data

    // Check if email exists in database
    const userCollection = await getCollection("users")

    if(!userCollection) return {errors: {email: "Server error"}}

    const existingUser = await userCollection.findOne({email})
    if(!existingUser){
        return {errors: {email: "Invalid credentials."}}
    }

    // Check password
    const hashedPassword = existingUser.password;
    const matchedPassword = await isValidPassword(password, hashedPassword)
    if(!matchedPassword){
        return {errors: {email: "Invalid credentials."}}
    }

    // Create a session for user
    await createSession(existingUser._id.toString())

    if (existingUser.isAdmin) {
        redirect("/admin")
    }

    // Redirect
    redirect("/dashboard")
}

export async function logout(){
    const cookieStore = await cookies();
    cookieStore.delete("userSession");
    redirect("/")
}

/**
 * Gets the authenticated user's profile data including orders
 */
export async function getUserProfile() {
  try {
    // Check if user is authenticated
    const authUser = await getAuthUser();
    
    if (!authUser) {
      console.log("AUTH: getUserProfile - No authenticated user found");
      return { 
        success: false, 
        error: "Unauthorized" 
      };
    }
    
    console.log(`AUTH: getUserProfile - Found authenticated user with ID: ${authUser.userId}`);
    
    // Fetch user data
    const usersCollection = await getCollection("users");
    
    const userData = await usersCollection?.findOne({ 
      _id: ObjectId.createFromHexString(authUser.userId as string) 
    });
    
    if (!userData) {
      console.log(`AUTH: getUserProfile - No user data found for ID: ${authUser.userId}`);
      return {
        success: false,
        error: "User not found"
      };
    }
    
    console.log(`AUTH: getUserProfile - Retrieved user data for ${authUser.userId}`);
    
    // Fetch orders for this user
    console.log(`AUTH: getUserProfile - Fetching orders for userId: ${authUser.userId}`);
    // Use the exact _id string from the user document to query orders
    const userIdForQuery = userData._id.toString();
    console.log(`AUTH: getUserProfile - Using exact MongoDB _id string for query: ${userIdForQuery}`);
    const orders = await getOrdersByUserId(userIdForQuery);
    console.log(`AUTH: getUserProfile - Found ${orders?.length || 0} orders for user ${userIdForQuery}`);
    
    // Return combined profile data
    return {
      success: true,
      user: {
        userId: authUser.userId,
      },
      userData: {
        email: userData.email,
        points: userData.points || 0,
        isAdmin: userData.isAdmin,
        // Include other user data fields as needed
      },
      orders: orders ? orders.map((order: any) => ({
        ...order,
        _id: order._id.toString(),
        // Ensure userId is a string
        userId: order.userId ? order.userId.toString() : authUser.userId,
        // Ensure lastUpdated is present for sorting functionality
        lastUpdated: order.lastUpdated ? 
                     (order.lastUpdated instanceof Date ? order.lastUpdated.toISOString() : order.lastUpdated) : 
                     (order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt)
      })) : []
    };
    
  } catch (error) {
    console.error("AUTH: Error fetching user profile:", error);
    return {
      success: false,
      error: "An error occurred while fetching the user profile"
    };
  }
}