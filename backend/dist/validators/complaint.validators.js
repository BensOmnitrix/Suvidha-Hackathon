import { z } from "zod";
export const createComplaintSchema = z.object({
    body: z.object({
        subject: z.string().min(5, "Subject must be at least 5 characters"),
        description: z.string().min(10, "Description must be at least 10 characters"),
        complaintCategory: z.string().min(3, "Category is required"),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        locationDetails: z.any().optional(),
    }),
});
