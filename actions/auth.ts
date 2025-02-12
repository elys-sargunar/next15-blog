"use server"

import { getCollection, isValidPassword } from "@/lib/db";
import { LoginFormSchema, RegisterFormSchema } from "@/lib/rules";
import { hashPassword} from "@/lib/db"
import { redirect } from "next/navigation";
import { createSession } from "@/lib/sessions";
import { cookies } from "next/headers";


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

    // Redirect
    redirect("/dashboard")
}

export async function logout(){
    const cookieStore = await cookies();
    cookieStore.delete("userSession");
    redirect("/")
}