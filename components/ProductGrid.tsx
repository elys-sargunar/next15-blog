import { getCollection } from "@/lib/db";
import MenuItemCard from "./MenuItemCard";
import { FoodItem } from "@/lib/rules";
export default async function ProductGrid(category: string){

  const dbCollection = await getCollection("menuItems")
  const dbItems = await dbCollection?.find().sort({$natural: -1}).toArray()

  console.log(category)

  if(dbItems){
    return (
      <div className="grid grid-cols-2 gap-6 my-16">
        {
          dbItems.map((dbItem) => (
            <div key={dbItem._id.toString()}>
              <MenuItemCard menuItem={dbItem as unknown as FoodItem} ></MenuItemCard>
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