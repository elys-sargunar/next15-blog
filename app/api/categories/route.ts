import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

// Explicitly set Node.js runtime
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Access the menu categories collection
    const menuCategories = await getCollection("menuCategories");
    
    if (!menuCategories) {
      return NextResponse.json(
        { error: "Failed to connect to categories collection" },
        { status: 500 }
      );
    }
    
    // Fetch all categories
    const categories = await menuCategories.find({}).toArray();
    
    // Safely serialize MongoDB documents
    const serializedCategories = JSON.parse(JSON.stringify(
      categories.map(category => ({
        ...category,
        _id: category._id.toString(),
        // Convert any date objects to ISO strings
        expiryDate: category.expiryDate ? category.expiryDate.toISOString() : undefined,
      }))
    ));
    
    return NextResponse.json({ 
      categories: serializedCategories 
    });
    
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching categories" },
      { status: 500 }
    );
  }
} 