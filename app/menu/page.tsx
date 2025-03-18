import { getCollection, getMenuCategories } from "@/lib/db";
import Link from "next/link";
import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
 
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { date } from "zod";


export default async function Menu() {
  const menuCollection = await getMenuCategories(new Date(Date.now()))

  if(!menuCollection) return <p>Failed to fetch menu categories data.</p>

  if(await menuCollection.countDocuments() === 0) return <p>You don't have any menu categories yet.</p>
  
  // Fetch menu items from the collection
  const menuItems = await menuCollection.find({}).toArray();

  return (
    <div>
      <h1 className="title">Menu Categories</h1>
      {menuItems.length > 0 && (
        <Carousel opts={{
            align: "start",
            loop: true,            
        }}
        >
            <CarouselContent className="-ml-1">
                {menuItems?.map((menuCategoryItem) => (
                    <CarouselItem key={menuCategoryItem._id.toString()} className="md:basis-1/2 lg:basis-1/3">
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
    </div>
  )
}
