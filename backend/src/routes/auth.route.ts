import { Router } from "express";
import { otpLimiter } from "../middlewares/rateLimiters.js";
import {
  sendOtpSchema,
  signinSchema,
  signupSchema,
} from "../validators/auth.validators.js";
import { sendOTP, signup } from "../controllers/auth/signup.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../middlewares/validate.middleware.js";
import { signin } from "../controllers/auth/signin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { logout, logoutAll } from "../controllers/auth/logout.controller.js";
import { refresh, getSession } from "../controllers/auth/refresh.controller.js";

export const authRouter = Router();

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

// Send OTP
authRouter.post(
  "/otp",
  otpLimiter,
  validate(sendOtpSchema),
  asyncHandler(sendOTP),
);

// Signup
authRouter.post("/signup", validate(signupSchema), asyncHandler(signup));

// Signin (returns access + refresh tokens)
authRouter.post("/signin", validate(signinSchema), asyncHandler(signin));

// Refresh access token (uses refresh token from cookie)
authRouter.post("/refresh", asyncHandler(refresh));

// Get current session status
authRouter.get("/session", asyncHandler(getSession));

// ============================================
// PROTECTED ROUTES (Auth required)
// ============================================

// Logout (current device)
authRouter.post("/logout", authenticate, asyncHandler(logout));

// Logout from all devices
authRouter.post("/logout-all", authenticate, asyncHandler(logoutAll));
