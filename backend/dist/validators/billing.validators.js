import { z } from "zod";
export const payBillSchema = z.object({
    body: z.object({
        billId: z.string().uuid("Invalid Bill ID"),
        paymentMethod: z.string().min(1, "Payment method is required"),
        amount: z.number().positive("Amount must be positive"), // Use number/string depending on payload, assuming number from JSON
    }),
});
