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

export const foodItemCategory = z.object({
    name: z.string().min(1,"Food category name is required"),
    expiryDate: z.date().optional() // optional expiry date for category i.e seasonal promotions
})

export const foodItemSchema = z.object({
    name: z.string().min(1, "Food item name is required"),
    category: z.array(foodItemCategory).nonempty("At least one item category is required"), // array of ordered food item categories
    quantity: z.number().min(1, "Quantity should be at least 1"),
    price: z.number().min(0, "Price must be a positive value"),
    specialInstructions: z.string().optional(),
  });
  

// Zod schema for the food order
export const foodOrderSchema = z.object({
    orderId: z.string().uuid("Invalid order ID"), // Unique order ID
    tableNumber: z.number().min(1, "Table number must be a positive integer").optional(), // table number
    customer: z.string().min(1, "Customer name is required"), // customer name
    items: z.array(foodItemSchema).nonempty("At least one food item is required"), // array of ordered food items
    totalPrice: z.number().min(0, "Total price must be a positive value"), // total price
    currency:  z.string(), // customer currency
    specialInstructions: z.string().optional(), // Optional special instructions for the order
    orderPlacedAt: z.date(), // Date and time when the order was placed (includes time)
});