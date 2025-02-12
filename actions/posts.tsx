"use server"

import getAuthUser from "@/lib/getAuthUser";
import { BlogPostSchema } from "@/lib/rules";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function createPost(state, formData){

    // Check if the user is signed in
    const user = await getAuthUser()
    if(!user){
        return redirect("/login"); 
    }

    // Validate form fields
    const title = formData.get("title");
    const content = formData.get("content");

    const validatedFields = BlogPostSchema.safeParse({
        title, content
    })

    // If any form fields are invalid
    if(!validatedFields.success){
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            title,
            content
        }
    }

    // Save new post to DB.
    try {
        const postsCollection = await getCollection("posts");
        const post = {
            title: validatedFields.data.title,
            content: validatedFields.data.content,
            userId: ObjectId.createFromHexString(user.userId)
        }
        await postsCollection?.insertOne(post)
        console.log(post.userId)
    }
    catch(error) {
        return {
            errors: {title: error.message}
        };
    }    

    // console.log(title, content)
    redirect("/dashboard")
}