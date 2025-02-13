"use server"

import getAuthUser from "@/lib/getAuthUser";
import { BlogPostSchema } from "@/lib/rules";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

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

export async function updatePost(state, formData){

    // Check if the user is signed in
    const user = await getAuthUser()
    if(!user){
        return redirect("/login"); 
    }

    //console.log(formData.get("postId"))

    // Validate form fields
    const title = formData.get("title");
    const content = formData.get("content");
    const postId = formData.get("postId");

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

    // Find the post
    const postsCollection = await getCollection("posts");
    const post = await postsCollection?.findOne({
        _id: ObjectId.createFromHexString(postId)
    })

    // Check users own post
    if(user.userId !== post?.userId.toString()){
        return redirect("/")
    }

    // Update the post in DB.
    postsCollection?.findOneAndUpdate(
        {_id: post?._id},
        {
            $set:{
                title: validatedFields.data.title,
                content: validatedFields.data.content
            },
        } 
    )    

    // console.log(title, content)
    redirect("/dashboard")
}

export async function deletePost(formData){
    // Check if the user is signed in
    const user = await getAuthUser()
    if(!user){
        return redirect("/"); 
    }

    const postCollection = await getCollection("posts")
    const post = await postCollection?.findOne({
        _id: ObjectId.createFromHexString(formData.get("postId")),
    })

    if(user.userId !== post?.userId.toString()) return redirect("/")

    //Delete the post
    postCollection?.findOneAndDelete({
        _id: post?._id
    })

    revalidatePath("/dashboard")

}