"use client"

import { useCart, FoodItemWithId } from "@/lib/CartContext";
import Image from "next/image";
import { useState } from "react";

type MenuItemsProps = {
  menuItems: FoodItemWithId[];
};

export default function MenuItems({ menuItems }: MenuItemsProps) {
  const { addItem } = useCart();
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  const handleAddToCart = (item: FoodItemWithId) => {
    addItem(item);
    
    // Get ID as string
    const itemId = typeof item._id === 'string' ? item._id : item._id.toString();
    
    // Show "Added" feedback
    setAddedItems(prev => ({ ...prev, [itemId]: true }));
    
    // Reset after 2 seconds
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [itemId]: false }));
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {menuItems.map((item) => {
        // Get ID as string
        const itemId = typeof item._id === 'string' ? item._id : item._id.toString();
        
        return (
          <div 
            key={itemId}
            className="border rounded-lg overflow-hidden shadow-md bg-white"
          >
            <div className="h-48 bg-gray-200 relative">
              {/* Placeholder for food image */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-500">Food Image</span>
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
              
              {item.description && (
                <p className="text-gray-600 mb-3">{item.description}</p>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">£{(item.price / 100).toFixed(2)}</span>
                
                <button
                  onClick={() => handleAddToCart(item)}
                  className={`px-4 py-2 rounded-full ${
                    addedItems[itemId]
                      ? "bg-green-500 shadow-md text-white"
                      : "bg-slate-800 shadow-md text-white"
                  } transition-colors`}
                >
                  {addedItems[itemId] ? "Added!" : "Add to Order"}
                </button>
              </div>
              
              {/* Additional item info */}
              <div className="mt-3 text-sm text-gray-500">
                {item.allergies && item.allergies.length > 0 && (
                  <p>Allergies: {item.allergies.join(", ")}</p>
                )}
                <small>Calories: {item.nutritionalInfo?.calories}</small>
                <small>{item.menuCategory?.map((cat: any) => cat.name).join(", ")}</small>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 