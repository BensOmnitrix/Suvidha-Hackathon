import rateLimit from "express-rate-limit";
import { type Request, type Response } from "express";

export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later.",
        });
    },
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts. Try again later.",
});

export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: "Too many OTP requests. Try later.",
});
