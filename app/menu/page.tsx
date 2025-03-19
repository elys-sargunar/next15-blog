import { getCollection } from "@/lib/db";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import MenuItems from "@/components/MenuItems";
import { FoodItemWithId } from "@/lib/CartContext";

export default async function Menu() {
  const menuCategories = await getCollection("menuCategories");
  const menuItemCollection = await getCollection("menuItems");

  if (!menuCategories) return <p>Failed to fetch menu categories data.</p>
  if (await menuCategories.countDocuments() === 0) return <p>You don't have any menu categories yet.</p>
  
  if (!menuItemCollection) return <p>Failed to fetch menu items data.</p>
  if (await menuItemCollection.countDocuments() === 0) return <p>You don't have any menu items yet.</p>

  // Fetch menu items from the collection
  const menuCategoryItems = await menuCategories.find({}).toArray();
  const menuItems = await menuItemCollection.find({}).toArray();

  // Safely serialize the MongoDB documents using JSON methods
  // This removes all methods and preserves only data
  const serializedCategories = JSON.parse(JSON.stringify(
    menuCategoryItems.map((cat: any) => ({
      ...cat,
      _id: cat._id.toString() // Convert ObjectId to string first
    }))
  ));

  const serializedMenuItems = JSON.parse(JSON.stringify(
    menuItems.map((item: any) => ({
      ...item,
      _id: item._id.toString() // Convert ObjectId to string first
    }))
  ));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Our Menu</h1>
      
      {/* Categories Carousel */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Categories</h2>
        {serializedCategories.length > 0 && (
          <Carousel opts={{ align: "start", loop: true }}>
            <CarouselContent className="-ml-4">
              {serializedCategories.map((category: any) => (
                <CarouselItem key={category._id} className="pl-4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                  <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                      <span className="text-xl font-semibold">{category.name}</span>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        )}
      </section>

      {/* Menu Items Grid */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Menu Items</h2>
        <MenuItems menuItems={serializedMenuItems} />
      </section>
    </div>
  );
} 
