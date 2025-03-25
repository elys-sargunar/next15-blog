"use client"

import { useState } from "react";
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
import { getCategories, getMenuItems } from "@/actions/menu";

// Define types for our data
type Category = {
  _id: string;
  name: string;
};

type MenuItem = {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  menuCategory: CategoryRef[];
};

type CategoryRef = {
  _id: string;
  name: string;
};

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch menu data when component mounts
  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch categories using server action
        const categoryResult = await getCategories();
        if (!categoryResult.success) throw new Error(categoryResult.error || 'Failed to fetch categories');
        setCategories((categoryResult.categories || []) as Category[]);
        
        // Fetch menu items using server action
        const itemsResult = await getMenuItems();
        if (!itemsResult.success) throw new Error(itemsResult.error || 'Failed to fetch menu items');
        setMenuItems((itemsResult.menuItems || []) as MenuItem[]);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load menu data');
        setLoading(false);
        console.error(err);
      }
    }
    
    fetchData();
  }, []);

  // Filter menu items by selected category
  const filteredMenuItems = React.useMemo(() => {
    if (!selectedCategory) return menuItems;
    
    return menuItems.filter(item => {
      if (!item.menuCategory) return false;
      
      // Check if any of the item's categories match the selected category
      return item.menuCategory.some((cat: CategoryRef) => 
        cat.name === selectedCategory
      );
    });
  }, [menuItems, selectedCategory]);

  // Handle category selection
  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(prev => prev === categoryName ? null : categoryName);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Loading menu items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container shadow-none mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Our Menu</h1>
      
      {/* Categories Carousel */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Categories</h2>
          {selectedCategory && (
            <button 
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>
        
        {categories.length > 0 && (
          <Carousel opts={{ align: "start", loop: true }}>
            <CarouselContent className="-ml-4 md:max-w-screen-lg mx-auto">
              {categories.map((category: Category) => (
                <CarouselItem key={category._id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/5 lg:basis-1/6 xl:basis-1/6">
                  <Card 
                    className={`cursor-pointer transition-colors ${
                      selectedCategory === category.name 
                        ? 'border-2 border-slate-800 bg-blue-50' 
                        : ''
                    }`}
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                      <span className={`text-lg md:text-xl font-semibold text-center leading-6 ${
                        selectedCategory === category.name 
                          ? 'text-slate-800' 
                          : ''
                      }`}>
                        {category.name}
                      </span>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="bg-slate-800 text-white" style={{left: '-1.5rem'}}/>
            <CarouselNext className="bg-slate-800 text-white" style={{right: '-2.5rem'}}/>
          </Carousel>
        )}
      </section>

      {/* Menu Items Grid */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          {selectedCategory 
            ? `${selectedCategory} Items` 
            : 'All Menu Items'}
        </h2>
        {filteredMenuItems.length > 0 ? (
          <MenuItems menuItems={filteredMenuItems as unknown as FoodItemWithId[]} />
        ) : (
          <p className="text-center py-8 text-gray-500">
            No menu items found {selectedCategory ? `in "${selectedCategory}" category` : ''}.
          </p>
        )}
      </section>
    </div>
  );
} 
