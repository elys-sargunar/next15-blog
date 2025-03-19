"use client"

import { useState } from "react";
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

export default function MenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch menu data when component mounts
  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch categories
        const categoryResponse = await fetch('/api/categories');
        if (!categoryResponse.ok) throw new Error('Failed to fetch categories');
        const categoryData = await categoryResponse.json();
        setCategories(categoryData.categories);
        
        // Fetch menu items
        const itemsResponse = await fetch('/api/menuItems');
        if (!itemsResponse.ok) throw new Error('Failed to fetch menu items');
        const itemsData = await itemsResponse.json();
        setMenuItems(itemsData.menuItems);
        
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
      return item.menuCategory.some((cat: any) => 
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
    <div className="mx-auto px-4 py-8">
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
            <CarouselContent className="-ml-4">
              {categories.map((category: any) => (
                <CarouselItem key={category._id} className="pl-4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                  <Card 
                    className={`cursor-pointer transition-colors ${
                      selectedCategory === category.name 
                        ? 'border-2 border-blue-500 bg-blue-50' 
                        : ''
                    }`}
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                      <span className={`text-xl font-semibold ${
                        selectedCategory === category.name 
                          ? 'text-blue-700' 
                          : ''
                      }`}>
                        {category.name}
                      </span>
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
        <h2 className="text-2xl font-semibold mb-4">
          {selectedCategory 
            ? `${selectedCategory} Menu Items` 
            : 'All Menu Items'}
        </h2>
        {filteredMenuItems.length > 0 ? (
          <MenuItems menuItems={filteredMenuItems} />
        ) : (
          <p className="text-center py-8 text-gray-500">
            No menu items found {selectedCategory ? `in "${selectedCategory}" category` : ''}.
          </p>
        )}
      </section>
    </div>
  );
} 
