import { z } from "zod";
export const sendOtpSchema = z.object({
    mobileNumber: z.string().min(10).max(15),
    purpose: z.enum(["login", "registration"]),
});
export const signupSchema = z.object({
    mobileNumber: z.string().min(10).max(15),
    otp: z.string().length(6),
    citizenId: z.string().min(3),
    fullName: z.string().min(2),
    email: z.string().email().optional(),
    dateOfBirth: z.string().optional(),
    address: z.any().optional(),
});
export const signinSchema = z.object({
    mobileNumber: z.string().min(10).max(15),
    otp: z.string().length(6),
});
