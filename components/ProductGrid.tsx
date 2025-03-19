import {foodItemCategory} from "@/lib/rules"
import PostCard from "@/components/PostCard";
import { getCollection } from "@/lib/db";
import MenuItemCard from "./MenuItemCard";
import { foodItemSchema, allergiesSchema, nutritionalInfoSchema, supplierSchema } from "@/lib/rules";

export default async function ProductGrid(category: any){

  const dbCollection = await getCollection("menuItems")
  const dbItems = await dbCollection?.find().sort({$natural: -1}).toArray()

  console.log(dbItems)

  if(dbItems){
    return (
      <div className="grid grid-cols-2 gap-6">
        {
          dbItems.map((menuItem: any) => (
            <div key={menuItem._id.toString()}>
              <MenuItemCard menuItem={menuItem} ></MenuItemCard>
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