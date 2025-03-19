import { getCollection } from "@/lib/db";
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Link from "next/link";
import ProductTable from "@/components/ProductTable";
import { foodItemCategory, foodItemSchema } from "@/lib/rules";
import ProductGrid from "@/components/ProductGrid";


export default async function Menu() {
  const menuCategories = await getCollection("menuCategories")
  const menuItemCollection = await getCollection("menuItems")

  if(!menuCategories) return <p>Failed to fetch menu categories data.</p>
  if(await menuCategories.countDocuments() === 0) return <p>You don't have any menu categories yet.</p>
  
  // Fetch menu items from the collection
  const menuCategoryItems = await menuCategories?.find({}).toArray();
  const menuItems = await menuItemCollection?.find({}).toArray();

  return (
    <>
        <section className="mt-10">
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
            )}
        </section>

        <section>
            <h2 className="font-semibold mb-4 text-center">Appetisers</h2>
            <ProductGrid category="Appetisers"></ProductGrid>
        </section>
        
        <section>
            <h2 className="font-semibold mb-4 text-center">All Products</h2>
            {menuItems && (  
                <>      
                    <ProductTable items={menuItems} schema={foodItemSchema}></ProductTable>
                    {/* <ProductTable items={menuCategoryItems} schema={foodItemCategory}></ProductTable> */}
                </>
            )}
        </section>
    </>
  )
}
