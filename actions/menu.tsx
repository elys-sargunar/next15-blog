"use server"

import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function getAllMenuItems(categoryName?: string | null) {
  try {
    // Access the menu items collection
    const menuItemCollection = await getCollection("menuItems");
    
    if (!menuItemCollection) {
      throw new Error("Failed to connect to menu items collection");
    }
    
    // Prepare the query - filter by category if provided
    let query = {};
    if (categoryName) {
      query = { "menuCategory.name": categoryName };
    }
    
    // Fetch menu items with the query
    const menuItems = await menuItemCollection.find(query).toArray();
    
    // Safely serialize MongoDB documents
    return menuItems.map(item => ({
      ...item,
      _id: item._id.toString(),
      // Handle nested objects with IDs
      menuCategory: item.menuCategory?.map((cat: any) => ({
        ...cat,
        _id: cat._id ? cat._id.toString() : undefined,
        expiryDate: cat.expiryDate ? cat.expiryDate.toISOString() : undefined,
      })),
    }));
  } catch (error) {
    console.error("Error fetching menu items:", error);
    throw new Error("Failed to fetch menu items");
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