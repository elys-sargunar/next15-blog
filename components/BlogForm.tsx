"use client"

import { useActionState } from "react"

// Define the PostCard type
type PostCard = {
    _id: string;
    title: string;
    content: string;
    userId: string;    
};

export default function BlogForm({handler, post} : {handler: any, post?: PostCard}){
    const [state, action, isPending] = useActionState(handler, undefined)

    return (
        <form action={action} className="space-y-4">
            <input type="hidden" className="hidden" name="postId" defaultValue={post?._id}/>
            <div>
                <label htmlFor="title">Title</label>
                <input type="text" name="title" defaultValue={state?.title || post?.title}/>
                {state?.errors?.title && (
                    <p className="error">{state.errors.title}</p>
                )} 

                <label htmlFor="content">Content</label>
                <textarea name="content" id="content" rows={6} defaultValue={state?.content || post?.content}></textarea>
                {state?.errors?.content && (
                    <p className="error">{state.errors.content}</p>
                )}

            </div>
            <button className="btn-primary" disabled={isPending}>
                {isPending ? "Loading..." : "Submit"}
            </button>
        </form>
    )
}