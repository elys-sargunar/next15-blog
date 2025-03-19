import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Parse query parameters to support category filtering
    const { searchParams } = new URL(request.url);
    const categoryName = searchParams.get('category');
    
    // Access the menu items collection
    const menuItemCollection = await getCollection("menuItems");
    
    if (!menuItemCollection) {
      return NextResponse.json(
        { error: "Failed to connect to menu items collection" },
        { status: 500 }
      );
    }
    
    // Prepare the query - filter by category if provided
    let query = {};
    if (categoryName) {
      query = { "menuCategory.name": categoryName };
    }
    
    // Fetch menu items with the query
    const menuItems = await menuItemCollection.find(query).toArray();
    
    // Safely serialize MongoDB documents
    const serializedItems = JSON.parse(JSON.stringify(
      menuItems.map(item => ({
        ...item,
        _id: item._id.toString(),
        // Handle nested objects with IDs
        menuCategory: item.menuCategory?.map((cat: any) => ({
          ...cat,
          _id: cat._id ? cat._id.toString() : undefined,
          expiryDate: cat.expiryDate ? cat.expiryDate.toISOString() : undefined,
        })),
      }))
    ));
    
    return NextResponse.json({ 
      menuItems: serializedItems 
    });
    
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching menu items" },
      { status: 500 }
    );
  }
} 