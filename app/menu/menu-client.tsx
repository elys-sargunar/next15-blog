import * as React from "react"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import ProductTable from "@/components/ProductTable";
import { foodItemCategory, foodItemSchema } from "@/lib/rules";
import ProductGrid from "@/components/ProductGrid";
import { FoodItem } from "@/lib/rules";

export default function MenuClient({ menuData }: { 
  menuData: { 
    menuCategoryItems?: any[]; 
    menuItems?: FoodItem[]; 
    error?: string;
    menuCategoryEmpty?: boolean;
    menuItemsEmpty?: boolean;
  } 
}) {
  if(menuData.error) return <p>{menuData.error}</p>;
  if(menuData.menuCategoryEmpty) return <p>You don't have any menu categories yet.</p>;
  if(menuData.menuItemsEmpty) return <p>You don't have any menu items yet.</p>;

  return (
    <>            
      <section className="mt-10">
        <h1 className="title">Menu</h1>
        {menuData.menuCategoryItems && menuData.menuCategoryItems.length > 0 && (
          <Carousel opts={{
            align: "start",
            loop: true,            
          }}>
            <CarouselContent className="-ml-1">
              {menuData.menuCategoryItems?.map((menuCategoryItem) => (
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
        <ProductGrid category="Appetisers" items={menuData.menuItems} />            
        <ProductGrid category="Main Course" items={menuData.menuItems} />
      </section>
      
      <section>
        <h2 className="font-semibold mb-4 text-center">All Products</h2>
        {menuData.menuItems && menuData.menuCategoryItems && (  
          <>      
            <ProductTable items={menuData.menuItems} schema={foodItemSchema} />
            <ProductTable items={menuData.menuCategoryItems} schema={foodItemCategory} />
          </>
        )}
      </section>
    </>
  );
} 