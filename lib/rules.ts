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
