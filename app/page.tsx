import PostCard from "@/components/PostCard";
import { getCollection } from "@/lib/db";

export default async function Home() {

  const postsCollection = await getCollection("posts")
  const posts = await postsCollection?.find().sort({$natural: -1}).toArray()

  // console.log(posts)

  if(posts){
    return (
      <div className="grid grid-cols-2 gap-6">
        {
          posts.map((post) => (
            <div key={post._id.toString()}>
              <PostCard post={post as unknown as {_id: string, title: string, content: string}} ></PostCard>
            </div>
          ))
        }
      </div>
    )
  }
  else {
    return <p>Cannot find any posts.</p>
  }
}
