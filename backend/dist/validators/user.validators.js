import { z } from "zod";
export const updateAccountSchema = z.object({
    body: z.object({
        fullName: z.string().min(3, "Full name must be at least 3 characters").optional(),
        email: z.string().email("Invalid email address").optional(),
        preferredLanguage: z.string().optional(),
    }),
});
