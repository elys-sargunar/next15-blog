"use server"

import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { FoodCategory } from '@/lib/rules';

/**
 * Gets all menu categories
 */
export async function getCategories() {
  try {
    // Access the menu categories collection
    const menuCategories = await getCollection("menuCategories");
    
    if (!menuCategories) {
      return {
        success: false,
        error: "Failed to connect to categories collection"
      };
    }
    
    // Fetch all categories
    const categories = await menuCategories.find({}).toArray();
    
    // Safely serialize MongoDB documents with explicit type structure
    const serializedCategories = categories.map(category => ({
      _id: category._id.toString(),
      name: category.name || "",  // Ensure name is always included
      // Include any other properties but preserve the required structure
      expiryDate: category.expiryDate ? category.expiryDate.toISOString() : undefined,
    }));
    
    return { 
      success: true,
      categories: serializedCategories 
    };
    
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error: "An error occurred while fetching categories"
    };
  }
}

/**
 * Gets menu items, optionally filtered by category
 */
export async function getMenuItems(categoryName?: string | null) {
  try {
    // Access the menu items collection
    const menuItemCollection = await getCollection("menuItems");
    
    if (!menuItemCollection) {
      return {
        success: false,
        error: "Failed to connect to menu items collection"
      };
    }
    
    // Prepare the query - filter by category if provided
    let query = {};
    if (categoryName) {
      query = { "menuCategory.name": categoryName };
    }
    
    // Fetch menu items with the query
    const menuItems = await menuItemCollection.find(query).toArray();
    
    // Safely serialize MongoDB documents with explicit type structure
    const serializedItems = menuItems.map(item => ({
      _id: item._id.toString(),
      name: item.name || "",  // Ensure required fields are present
      description: item.description || "",
      price: item.price || 0,
      image: item.image,  // Optional
      // Transform menuCategory to ensure proper structure
      menuCategory: Array.isArray(item.menuCategory) 
        ? item.menuCategory.map((cat: any) => ({
            _id: typeof cat._id !== 'undefined' ? cat._id.toString() : cat.name || "",
            name: cat.name || "",
            expiryDate: cat.expiryDate ? cat.expiryDate.toISOString() : undefined,
          }))
        : [],
      // Include other fields
      points: item.points || 0,
      available: item.available !== false,
      quantity: item.quantity || 0,
      nutritionalInfo: item.nutritionalInfo || null,
      allergies: item.allergies || [],
      isFeatured: item.isFeatured || false,
    }));
    
    return { 
      success: true,
      menuItems: serializedItems 
    };
    
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return {
      success: false,
      error: "An error occurred while fetching menu items"
    };
  }
}

export async function getMenuItemById(id: string) {
  try {
    // Check if ID is valid
    if (!id || !ObjectId.isValid(id)) {
      throw new Error("Invalid menu item ID");
    }
    
    // Access the menu items collection
    const menuItemCollection = await getCollection("menuItems");
    if (!menuItemCollection) {
      throw new Error("Failed to connect to menu items collection");
    }
    
    // Find the menu item by ID
    const menuItem = await menuItemCollection.findOne({ _id: new ObjectId(id) });
    
    if (!menuItem) {
      throw new Error("Menu item not found");
    }
    
    // Safely serialize MongoDB document
    return {
      ...menuItem,
      _id: menuItem._id.toString(),
      // Handle nested objects with IDs
      menuCategory: menuItem.menuCategory?.map((cat: any) => ({
        ...cat,
        _id: cat._id ? cat._id.toString() : undefined,
        expiryDate: cat.expiryDate ? cat.expiryDate.toISOString() : undefined,
      })),
    };
  } catch (error) {
    console.error("Error fetching menu item:", error);
    throw error;
  }
} 