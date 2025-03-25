import { string, z } from "zod";

export const RegisterFormSchema = z.object({
    email: z.string().email({message: "Please enter a valid email address"}).trim(),
    password: z
    .string()
    .min(1, {message: "Not be empty"})
    .min(8, {message: "Be at least 8 characters long"})
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {message: "Contain at least one uppercase letter, one lowercase letter, one number and one special character"})
    .trim(),
    confirmPassword: z.string().trim(),
}).superRefine((val, ctx) => {
    if(val.password !== val.confirmPassword){
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Passwords do not match",
            path: ["confirmPassword"],
        })
    }

})

export const LoginFormSchema = z.object({
    email: z.string().email({message: "Please enter a valid email address"}).trim(),
    password: z
    .string()
    .min(1, {message: "Password is required."}).trim()
})

export const BlogPostSchema = z.object({
    title: string().min(1, {message: "Title field is required."}).max(100, {message: "Title must be under 100 characters."}).trim(),
    content: string().min(1, {message: "Content field is required."}).trim(),
})
  

// Define the Nutritional Information schema
export const nutritionalInfoSchema = z.object({
    calories: z.number().int().min(0),  // Calories in the food item
    fat: z.number().min(0),             // Amount of fat in grams
    protein: z.number().min(0),         // Amount of protein in grams
    carbohydrates: z.number().min(0),   // Amount of carbohydrates in grams
    sugars: z.number().min(0),          // Amount of sugars in grams
    fiber: z.number().min(0),           // Amount of fiber in grams
});
  
// Define the Allergies schema
export  const allergiesSchema = z.array(z.string().nonempty());  // List of allergens

// Define the Supplier schema
export const supplierSchema = z.object({
    name: z.string().min(1),                  // Name of the supplier
    contact: z.string().email().optional(),   // Supplier contact email (optional)
    phone: z.string().min(10).optional(),     // Supplier contact phone (optional)
    stockLevel: z.number().int().min(0),      // Current stock level
    reorderThreshold: z.number().int().min(0), // Threshold to reorder from supplier
    leadTime: z.number().int().min(0),        // Lead time for restocking (in days)
});

export const foodItemCategory = z.object({
    name: z.string().min(1,"Food category name is required"),
    expiryDate: z.date().optional(), // optional expiry date for category i.e seasonal promotions
    available: z.boolean().default(true),     // Whether the item is available on the menu
})
export type FoodCategory = z.infer<typeof foodItemCategory>

// Define the Food Item schema
export const foodItemSchema = z.object({
    _id: z.string(),
    name: z.string().min(1),                  // Food name
    description: z.string().optional(),       // Food description (optional)
    price: z.number().min(0),                 // Price of the food item
    quantity: z.number().min(1),              // Quantity of the food item left in stock
    points: z.number().int().min(0).default(0), // Points earned when purchasing this item
    nutritionalInfo: nutritionalInfoSchema,   // Nutritional Information
    allergies: allergiesSchema,               // Allergens in the food item
    supplier: supplierSchema,                 // Supplier information
    available: z.boolean().default(true),     // Whether the item is available on the menu
    menuCategory: z.array(foodItemCategory).optional(),
    image: z.string().optional(),
    isFeatured: z.boolean().default(false)
});
export type FoodItem = z.infer<typeof foodItemSchema>

// Zod schema for the food order
export const foodOrderSchema = z.object({
    orderId: z.string().uuid("Invalid order ID"), // Unique order ID
    tableNumber: z.number().min(1, "Table number must be a positive integer").optional(), // table number
    customer: z.string().min(1, "Customer name is required"), // customer name
    items: z.array(foodItemSchema).nonempty("At least one food item is required"), // array of ordered food items
    totalPrice: z.number().min(0, "Total price must be a positive value"), // total price
    totalPoints: z.number().int().min(0).default(0), // Total points earned from this order
    currency: z.string(), // customer currency
    specialInstructions: z.string().optional(), // Optional special instructions for the order
    orderPlacedAt: z.date(), // Date and time when the order was placed (includes time)
});
export type FoodOrder = z.infer<typeof foodOrderSchema>
  
// Example usage of the schema to parse and validate an object
export const foodItemExample = {
name: "Cheese Burger",
description: "A delicious beef patty with melted cheese.",
price: 8.99,
quantity: 1,
nutritionalInfo: {
    calories: 500,
    fat: 25,
    protein: 30,
    carbohydrates: 40,
    sugars: 5,
    fiber: 3,
},
allergies: ["Gluten", "Dairy"],
supplier: {
    name: "Food Supplier Co.",
    contact: "supplier@foodco.com",
    phone: "1234567890",
    stockLevel: 100,
    reorderThreshold: 20,
    leadTime: 5,
},
available: true,
menuCategory: [{
    name: "Appetizers",
    expiryDate: new Date("2025-03-20"),
    available: true,
}],
image: "https://via.placeholder.com/150",
isFeatured: false,
points: 100,
};

// Define connection status type
export const connectionStatusEnum = z.enum(['active', 'error', 'closed', 'timeout']);
export type ConnectionStatus = z.infer<typeof connectionStatusEnum>;

// Define the SSE Connection schema for MongoDB storage
export const sseConnectionSchema = z.object({
  connectionId: z.string().min(1, "Connection ID is required"),
  userId: z.string().optional(),
  isAdmin: z.boolean().default(false),
  deviceType: z.enum(['mobile', 'desktop', 'unknown']).default('unknown'),
  userAgent: z.string().optional(),
  status: connectionStatusEnum.default('active'),
  createdAt: z.date().default(() => new Date()),
  lastPing: z.date().default(() => new Date()),
  ipAddress: z.string().optional(),
});

export type SSEConnection = z.infer<typeof sseConnectionSchema>;

// Define proper User schema that matches our MongoDB structure
export const userSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  password: z.string(),
  name: z.string().optional(),
  isAdmin: z.boolean().default(false),
  points: z.number().int().min(0).default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Type for User with proper ID handling
export type User = z.infer<typeof userSchema>;

// This simplified type is used when we just need to reference a user by ID
export type UserReference = {
  userId: string;
  isAdmin?: boolean;
};

// Define the order item schema that's actually used in the application
export const orderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  points: z.number().default(0),
  quantity: z.number().int().min(1)
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Define the actual Order schema used in the application (not the theoretical one above)
export const appOrderSchema = z.object({
  _id: z.string().optional(), // Optional because it's not present when creating a new order
  userId: z.string(), // String-based user ID
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  items: z.array(orderItemSchema),
  subTotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number(),
  pointsEarned: z.number().int().default(0),
  status: z.enum(['pending', 'accepted', 'completed', 'cancelled']).default('pending'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type AppOrder = z.infer<typeof appOrderSchema>;

// Type for order with string ID for client-side use
export type ClientOrder = {
  _id: string;
  userId: string;
  items: OrderItem[];
  totalPrice: number;
  totalPoints: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lastUpdated?: string;
};