"use client"

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCart, FoodItemWithId } from "@/lib/CartContext";
import { getMenuItemById } from "@/actions/menu";

export default function MenuItemDetail() {
  const { id } = useParams();
  const [menuItem, setMenuItem] = useState<FoodItemWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem } = useCart();

  // Fetch menu item data when component mounts
  useEffect(() => {
    async function fetchMenuItem() {
      try {
        setLoading(true);
        
        // Use the server action to fetch the menu item by ID
        // Make sure id is a string
        const itemId = Array.isArray(id) ? id[0] : id;
        const menuItemData = await getMenuItemById(itemId as string);
        
        setMenuItem(menuItemData as FoodItemWithId);
        setLoading(false);
      } catch (err) {
        setError('Failed to load menu item');
        setLoading(false);
        console.error(err);
      }
    }
    
    if (id) {
      fetchMenuItem();
    }
  }, [id]);

  // Handle add to cart with feedback
  const handleAddToCart = () => {
    if (menuItem) {
      addItem(menuItem);
      setAddedToCart(true);
      
      // Reset after 1 second
      setTimeout(() => {
        setAddedToCart(false);
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Loading menu item...</p>
      </div>
    );
  }

  if (error || !menuItem) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">{error || "Menu item not found"}</p>
        <Link href="/menu" className="mt-4 inline-block text-blue-600 hover:underline">
          Return to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 py-8 max-w-4xl">
      <Link href="/menu" className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Menu
      </Link>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          {/* Image Column */}
          <div className="md:w-1/2 bg-gray-200 h-64 md:h-auto flex items-center justify-center">
            <span className="text-gray-500">Food Image</span>
          </div>
          
          {/* Content Column */}
          <div className="md:w-1/2 p-6">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold mb-2">{menuItem.name}</h1>
              <span className="text-2xl font-bold">£{(menuItem.price / 100).toFixed(2)}</span>
            </div>
            
            {menuItem.menuCategory && menuItem.menuCategory.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {menuItem.menuCategory.map((category, index) => (
                  <span key={index} className="px-2 py-1 bg-slate-100 text-sm rounded">
                    {category.name}
                  </span>
                ))}
              </div>
            )}
            
            {menuItem.description && (
              <p className="text-gray-700 mb-6">{menuItem.description}</p>
            )}
            
            <button
              onClick={handleAddToCart}
              className={`w-full py-3 rounded-lg text-white font-medium transition-colors ${
                addedToCart
                  ? "bg-green-500"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {addedToCart ? "Added to Order!" : "Add to Order"}
            </button>
          </div>
        </div>
        
        {/* Nutritional Information & Allergies Section */}
        <div className="p-6 border-t">
          <h2 className="text-xl font-semibold mb-4">Nutritional Information & Allergens</h2>
          
          <div className="md:flex gap-10">
            {/* Nutritional Information */}
            <div className="mb-6 md:mb-0 md:w-1/2">
              <h3 className="font-medium mb-2">Nutritional Values</h3>
              {menuItem.nutritionalInfo ? (
                <ul className="space-y-1 text-gray-700">
                  <li className="flex justify-between">
                    <span>Calories:</span>
                    <span>{menuItem.nutritionalInfo.calories}</span>
                  </li>
                  {menuItem.nutritionalInfo.fat !== undefined && (
                    <li className="flex justify-between">
                      <span>Fat:</span>
                      <span>{menuItem.nutritionalInfo.fat}g</span>
                    </li>
                  )}
                  {menuItem.nutritionalInfo.protein !== undefined && (
                    <li className="flex justify-between">
                      <span>Protein:</span>
                      <span>{menuItem.nutritionalInfo.protein}g</span>
                    </li>
                  )}
                  {menuItem.nutritionalInfo.carbohydrates !== undefined && (
                    <li className="flex justify-between">
                      <span>Carbohydrates:</span>
                      <span>{menuItem.nutritionalInfo.carbohydrates}g</span>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-gray-500">Nutritional information not available</p>
              )}
            </div>
            
            {/* Allergies */}
            <div className="md:w-1/2">
              <h3 className="font-medium mb-2">Allergens</h3>
              {menuItem.allergies && menuItem.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {menuItem.allergies.map((allergy, index) => (
                    <span key={index} className="px-2 py-1 bg-red-50 text-red-700 rounded text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No allergens listed</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 