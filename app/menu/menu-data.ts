import { getCollection } from "@/lib/db";
import { FoodItem, FoodCategory } from "@/lib/rules";

export async function fetchMenuData() {
  const menuCategories = await getCollection("menuCategories")
  const menuItemCollection = await getCollection("menuItems")

  if(!menuCategories || !menuItemCollection) {
    return { error: "Failed to fetch data" };
  }
  
  if(await menuCategories.countDocuments() === 0) {
    return { menuCategoryItems: [], menuCategoryEmpty: true };
  }
  
  if(await menuItemCollection.countDocuments() === 0) {
    return { menuItems: [], menuItemsEmpty: true };
  }

  // Fetch menu items from the collection
  const menuCategoryItems = await menuCategories.find({}).toArray() as unknown as FoodCategory[];
  const menuItems = await menuItemCollection.find({}).toArray() as unknown as FoodItem[];

  return { menuCategoryItems, menuItems };
} 