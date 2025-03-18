import { getCollection } from "@/lib/db";
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Link from "next/link";


export default async function Menu() {
  const menuCategories = await getCollection("menuCategories")
  const menuItemCollection = await getCollection("menuItems")

  if(!menuCategories) return <p>Failed to fetch menu categories data.</p>

  if(await menuCategories.countDocuments() === 0) return <p>You don't have any menu categories yet.</p>
  
  // Fetch menu items from the collection
  const menuCategoryItems = await menuCategories.find({}).toArray();
  const menuItems = await menuItemCollection?.find({}).toArray();

  return (
    <div>
      <h1 className="title">Menu</h1>
      {menuCategoryItems.length > 0 && (
        <Carousel opts={{
            align: "start",
            loop: true,            
        }}>
            <CarouselContent className="-ml-1">
                {menuCategoryItems?.map((menuCategoryItem) => (
                    <CarouselItem key={menuCategoryItem._id.toString()} className="sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                    <div className="p-1">
                      <Card>
                        <CardContent className="flex aspect-square items-center justify-center p-6">
                          <span className="text-2xl font-semibold">{menuCategoryItem.name}</span>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}        
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
      )
      }

    {menuItems && (
        <table>
          <thead>
            <tr>
              <th className="w-3/6">Title</th>
              <th className="w-1/6 sr-only">View</th>
              <th className="w-1/6 sr-only">Delete</th>              
            </tr>
          </thead>
          <tbody>
            {menuItems.map((foodItemSchema) => (
              <tr key={foodItemSchema._id.toString()}>
                <td className="w-3/6">{foodItemSchema.name}</td>
                <td className="w-1/6 text-blue-500">
                  <Link href={`/posts/show/${foodItemSchema._id.toString()}`}>View</Link>
                </td>
                <td className="w-1/6 text-red-500">                
                  <form>
                    <input type="hidden" name="postId" defaultValue={foodItemSchema._id.toString()}/>
                    <button type="submit">Add</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
      }


    </div>
  )
}
