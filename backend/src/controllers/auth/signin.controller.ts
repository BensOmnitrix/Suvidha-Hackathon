import { prisma } from "../../lib/prisma.js";
import { verifyOTP } from "../../services/otp.service.js";
import { type Request, type Response } from "express";
import { generateTokenPair } from "../../services/jwt.service.js";
import { jwtConfig } from "../../config/jwt.js";

/**
 * Signin Controller (with JWT + Refresh Token)
 *
 * Flow:
 * 1. OTP verify karo
 * 2. User find karo
 * 3. Generate both tokens:
 *    - Access Token (JWT, 15 min, in response body)
 *    - Refresh Token (UUID, 7 days, in httpOnly cookie)
 * 4. Return user + access token
 */
export async function signin(req: Request, res: Response) {
  const { mobileNumber, otp } = req.body;

  // Step 1: Verify OTP
  const otpValid = await verifyOTP(mobileNumber, otp, "login");
  if (!otpValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  // Step 2: Find user
  const user = await prisma.user.findFirst({
    where: { mobileNumber, isActive: true },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not registered",
    });
  }

  // Step 3: Generate both tokens
  const { accessToken, refreshToken } = await generateTokenPair(
    {
      userId: user.userId,
      mobileNumber: user.mobileNumber,
      fullName: user.fullName,
      role: user.role,
    },
    req.ip,
    req.headers["user-agent"],
  );

  // Step 4: Update last login
  await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLoginAt: new Date() },
  });

  // Step 5: Set refresh token in httpOnly cookie
  // Ye cookie JavaScript se access nahi ho sakti (XSS protection!)
  res.cookie("refreshToken", refreshToken, {
    httpOnly: jwtConfig.cookie.httpOnly,
    secure: jwtConfig.cookie.secure,
    sameSite: jwtConfig.cookie.sameSite,
    maxAge: jwtConfig.cookie.maxAge,
    path: "/api/auth", // Sirf auth routes pe bhejega
  });

  // Step 6: Return response
  return res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      userId: user.userId,
      fullName: user.fullName,
      mobileNumber: user.mobileNumber,
      email: user.email,
      role: user.role,
    },
    accessToken, // Frontend isko memory me store karega
    // Note: refreshToken cookie me gaya, response body me nahi!
  });
}
