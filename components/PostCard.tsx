import Link from "next/link";

export default function PostCard({post} : {post: any}){
    return (
        <div className="border border-slate-600 border-dashed p-4 rounded-md h-full bg-white">
            <p className="text-slate-400 text-xs">
                {post._id.getTimestamp().toLocaleString()}
            </p>
            <Link href={`/posts/show/${post._id.toString()}`} className="block text-xl font-semibold mb-4">
                {post.title}
            </Link>
            <p className="text-sm">{post.content}</p>
        </div>
    )
}