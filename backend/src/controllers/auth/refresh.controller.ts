import { type Request, type Response } from "express";
import {
  refreshAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  generateRefreshToken,
  generateAccessToken,
} from "../../services/jwt.service.js";
import { jwtConfig } from "../../config/jwt.js";

/**
 * Refresh Token Controller
 *
 * Jab Access Token expire ho jaye, frontend ye endpoint call karega
 * Refresh token cookie me hoga, naya access token milega
 *
 * Flow:
 * 1. Cookie se refresh token nikalo
 * 2. Database me verify karo (valid + not expired + active)
 * 3. Naya access token generate karo
 * 4. (Optional) Naya refresh token bhi de do (Token Rotation)
 */
export async function refresh(req: Request, res: Response) {
  // Step 1: Get refresh token from cookie
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token required",
      code: "NO_REFRESH_TOKEN",
    });
  }

  // Step 2: Verify refresh token in database
  const session = await verifyRefreshToken(refreshToken);

  if (!session || !session.user) {
    // Clear invalid cookie
    res.clearCookie("refreshToken", { path: "/api/auth" });

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token. Please login again.",
      code: "INVALID_REFRESH_TOKEN",
    });
  }

  const user = session.user;

  // Step 3: Generate new access token
  const newAccessToken = generateAccessToken({
    userId: user.userId,
    mobileNumber: user.mobileNumber,
    fullName: user.fullName,
    role: user.role,
  });

  // Step 4: Token Rotation (Security best practice)
  // Purana refresh token invalidate karo, naya do
  // Isse agar kisi ne purana token chura liya, wo kaam nahi karega
  await revokeRefreshToken(refreshToken);

  const newRefreshToken = await generateRefreshToken(
    user.userId,
    req.ip,
    req.headers["user-agent"],
  );

  // Step 5: Set new refresh token cookie
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: jwtConfig.cookie.httpOnly,
    secure: jwtConfig.cookie.secure,
    sameSite: jwtConfig.cookie.sameSite,
    maxAge: jwtConfig.cookie.maxAge,
    path: "/api/auth",
  });

  return res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    accessToken: newAccessToken,
  });
}

/**
 * Get current session info
 * Frontend ke liye - check if still logged in
 */
export async function getSession(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(200).json({
      success: true,
      isAuthenticated: false,
    });
  }

  const session = await verifyRefreshToken(refreshToken);

  if (!session || !session.user) {
    return res.status(200).json({
      success: true,
      isAuthenticated: false,
    });
  }

  return res.status(200).json({
    success: true,
    isAuthenticated: true,
    user: {
      userId: session.user.userId,
      fullName: session.user.fullName,
      mobileNumber: session.user.mobileNumber,
      role: session.user.role,
    },
  });
}
