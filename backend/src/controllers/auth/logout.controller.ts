import type { Request, Response } from "express";
import {
  revokeRefreshToken,
  revokeAllUserSessions,
} from "../../services/jwt.service.js";

/**
 * Logout Controller
 *
 * Flow:
 * 1. Cookie se refresh token nikalo
 * 2. Database me session invalidate karo
 * 3. Cookie clear karo
 */
export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    // Invalidate refresh token in database
    await revokeRefreshToken(refreshToken);
  }

  // Clear the cookie
  res.clearCookie("refreshToken", { path: "/api/auth" });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

/**
 * Logout from all devices
 * Saare sessions invalidate karo
 */
export async function logoutAll(req: Request, res: Response) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  // Revoke all sessions for this user
  await revokeAllUserSessions(userId);

  // Clear current cookie
  res.clearCookie("refreshToken", { path: "/api/auth" });

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices",
  });
}
