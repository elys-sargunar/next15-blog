import { updatePost } from "@/actions/posts";
import BlogForm from "@/components/BlogForm";
import { getCollection } from "@/lib/db";
import getAuthUser from "@/lib/getAuthUser";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";

export default async function Edit({params}){

    const {id} = await params

    const user = await getAuthUser()

    const postsCollection = await getCollection("posts")

    let post
    if(id.length === 24 && postsCollection){
        post = await postsCollection.findOne({
            _id: ObjectId.createFromHexString(id),
        })
        post = JSON.parse(JSON.stringify(post))
        if(user?.userId !== post.userId) return redirect("/")
    }
    else {
        post = null
    }



    return (
        <div className="container w-1/2">
            <h1 className="title">Edit post</h1>

            {post ? <BlogForm handler={updatePost} post={post}/> : <p>Failed to fetch the data.</p>}
        </div>
    )
}