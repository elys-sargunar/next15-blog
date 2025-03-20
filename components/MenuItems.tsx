"use client"

import { useCart, FoodItemWithId } from "@/lib/CartContext";
import Image from "next/image";
import Link from "next/link";
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
    
    // Reset after 1 second
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [itemId]: false }));
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {menuItems.map((item) => {
        // Get ID as string
        const itemId = typeof item._id === 'string' ? item._id : item._id.toString();
        
        return (
          <div 
            key={itemId}
            className="border rounded-lg overflow-hidden shadow-md bg-white hover:shadow-lg transition-shadow flex flex-col h-full"
          >
            <div className="h-48 bg-gray-200 relative">
              <Link href={`/menu/${itemId}`}>
                {item.image ? (
                  <Image 
                    src={item.image} 
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-500">Food Image</span>
                  </div>
                )}
                
                {item.isFeatured && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 text-xs font-bold rounded-md">
                    Featured
                  </span>
                )}
                
                {!item.available || item.quantity < 1 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-bold px-3 py-1 bg-red-500 rounded">Not Available</span>
                  </div>
                )}
              </Link>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              {/* Menu categories */}
              {item.menuCategory && item.menuCategory.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.menuCategory.map((cat, idx) => (
                    <span key={idx} className="text-xs bg-slate-800 text-white px-2 py-1 rounded">
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}
              
              <h3 className="text-xl font-semibold mb-2">
                <Link href={`/menu/${itemId}`} className="hover:text-blue-600 transition-colors">
                  {item.name}
                </Link>
              </h3>
              
              {item.description && (
                <p className="text-gray-600 mb-3 text-sm line-clamp-2">{item.description}</p>
              )}
              
              {/* Price */}
              <div className="mb-3">
                <span className="text-lg font-bold">£{(item.price / 100).toFixed(2)}</span>
              </div>
              
              {/* Nutrition and allergens info */}
              <div className="flex-1">
                {/* Allergens */}
                {item.allergies && item.allergies.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Allergens:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.allergies.map((allergy, idx) => (
                        <span key={idx} className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Nutrition at a glance */}
                {item.nutritionalInfo && (
                  <div className="grid grid-cols-3 gap-1 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">{item.nutritionalInfo.calories}</span> cal
                    </div>
                    <div>
                      <span className="font-medium">{item.nutritionalInfo.protein}g</span> protein
                    </div>
                    <div>
                      <span className="font-medium">{item.nutritionalInfo.carbohydrates}g</span> carbs
                    </div>
                  </div>
                )}
              </div>
              
              {/* Stock info - moved above button */}
              {item.quantity && item.quantity < 10 && (
                <p className="text-xs text-amber-600 mt-auto mb-2">
                  Only {item.quantity} left in stock
                </p>
              )}
              
              {/* Add to cart button - now at bottom */}
              <button
                onClick={() => handleAddToCart(item)}
                disabled={!item.available}
                className={`w-full px-4 py-2 rounded-full ${
                  !item.available 
                    ? "bg-gray-300 cursor-not-allowed" 
                    : addedItems[itemId]
                      ? "bg-green-500 shadow-md text-white"
                      : "bg-slate-800 shadow-md text-white hover:bg-slate-700"
                } transition-colors text-sm mt-2`}
              >
                {!item.available ? "Not Available" : addedItems[itemId] ? "Added!" : "Add to Order"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
} 