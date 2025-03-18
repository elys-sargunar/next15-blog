import {foodItemCategory} from "@/lib/rules"
import PostCard from "@/components/PostCard";
import { getCollection } from "@/lib/db";

export default async function ProductGrid(category){

  const dbCollection = await getCollection("menuItems")
  const dbItems = await dbCollection?.find().sort({$natural: -1}).toArray()

  console.log(dbItems)

  if(dbItems){
    return (
      <div className="grid grid-cols-2 gap-6">
        {
          dbItems.map((post) => (
            <div key={post._id.toString()}>
              <PostCard post={post} ></PostCard>
            </div>
          ))
        }
      </div>
    )
  }
  else {
    return <p>Cannot find any products.</p>
  }
}