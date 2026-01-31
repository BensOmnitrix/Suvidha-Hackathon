import { z } from "zod";
export const registerKioskSchema = z.object({
    body: z.object({
        kioskCode: z.string().min(3, "Kiosk code is required"),
        locationName: z.string().min(3, "Location name is required"),
        locationType: z.string().optional(),
        address: z.any().refine((val) => val !== undefined, "Address is required"), // Validate JSON structure more strictly if needed
    }),
});
export const updateKioskStatusSchema = z.object({
    params: z.object({
        kioskId: z.string().uuid("Invalid Kiosk ID"),
    }),
    body: z.object({
        status: z.string().optional(),
        isOperational: z.boolean().optional(),
    }),
});
