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

// Zod schema for a single food item
const foodItemSchema = z.object({
    id: z.string().uuid("Invalid order ID"), // Unique food item ID
    name: z.string().min(1, "Food item name is required"), // name of the food item
    category: z.string(), // food item category
    quantity: z.number().min(1, "Quantity should be at least 1"), // quantity ordered
    price: z.number().min(0, "Price must be a positive value"), // price of the food item
    specialInstruction: z.string().optional(), // Optional special instructions for the order
    restrictions: z.array(string()).optional() // Optional restrictions like 18+
  });
  
  // Zod schema for the food order
  const foodOrderSchema = z.object({
    orderId: z.string().uuid("Invalid order ID"), // Unique order ID
    tableNumber: z.number().min(1, "Table number must be a positive integer").optional(), // table number
    customer: z.string().min(1, "Customer name is required"), // customer name
    items: z.array(foodItemSchema).nonempty("At least one food item is required"), // array of ordered food items
    totalPrice: z.number().min(0, "Total price must be a positive value"), // total price
    currency:  z.string(), // customer currency
    specialInstructions: z.string().optional(), // Optional special instructions for the order
  });