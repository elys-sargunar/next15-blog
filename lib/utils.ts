import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper functions for MongoDB document serialization
 */

/**
 * Safely converts any MongoDB ObjectId (or similar object) to a string
 * @param id - The ID to convert, can be string, ObjectId, or null/undefined
 * @returns A string representation of the ID, or an empty string if invalid
 */
export function safeToString(id: any): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (id.toString && typeof id.toString === 'function') return id.toString();
  return '';
}

/**
 * Safely serializes a MongoDB document (or any object containing ObjectIds)
 * to make it compatible with Next.js client components
 * @param doc - The MongoDB document to serialize
 * @returns A new object with all ObjectIds converted to strings
 */
export function serializeDocument<T extends Record<string, any>>(doc: T): T {
  if (!doc) return null as any;
  
  // Convert to plain object without MongoDB specific features
  const serialized = JSON.parse(JSON.stringify(doc));
  
  // Ensure _id is a string if it exists
  if (doc._id) {
    serialized._id = safeToString(doc._id);
  }
  
  // Ensure userId is a string if it exists
  if (doc.userId) {
    serialized.userId = safeToString(doc.userId);
  }
  
  return serialized;
}

/**
 * Serializes date fields in a document to make them compatible with Next.js client components
 * @param doc - The document containing date fields
 * @param dateFields - Array of field names that contain dates
 * @returns A new object with all specified date fields converted to ISO strings
 */
export function serializeDates<T extends Record<string, any>>(doc: T, dateFields: string[] = ['createdAt', 'updatedAt']): T {
  if (!doc) return null as any;
  
  const result = { ...doc };
  
  for (const field of dateFields) {
    if (doc[field] instanceof Date) {
      result[field] = doc[field].toISOString();
    }
  }
  
  return result;
}
