/**
 * JWT Service - Token generation and verification
 *
 * Ye service 2 kaam karti hai:
 * 1. Tokens banana (sign)
 * 2. Tokens verify karna
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { jwtConfig } from "../config/jwt.js";
import { prisma } from "../lib/prisma.js";

// ============================================
// TYPES
// ============================================

/**
 * Access Token me ye data hoga
 * Ye data har API request me available hoga (without DB query!)
 */
export interface AccessTokenPayload {
  userId: string;
  mobileNumber: string;
  fullName: string;
  role: string;
}

/**
 * Token pair - login pe dono milenge
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ============================================
// ACCESS TOKEN FUNCTIONS
// ============================================

/**
 * Access Token create karo (JWT)
 *
 * @param payload - User data jo token me store hoga
 * @returns JWT string
 *
 * Example:
 * generateAccessToken({ userId: "123", mobileNumber: "9999999999", ... })
 * Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, jwtConfig.accessToken.secret, {
    expiresIn: jwtConfig.accessToken.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Access Token verify karo
 *
 * @param token - JWT string
 * @returns Decoded payload ya null (if invalid/expired)
 *
 * Note: Ye function DB query NAHI karta! Sirf signature check.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, jwtConfig.accessToken.secret);
    return decoded as AccessTokenPayload;
  } catch (error) {
    // Token invalid ya expired
    return null;
  }
}

// ============================================
// REFRESH TOKEN FUNCTIONS
// ============================================

/**
 * Refresh Token create karo
 *
 * Refresh token = Random UUID (stored in DB)
 * Ye JWT nahi hai, simple random string hai
 *
 * @param userId - User ID
 * @param ip - User's IP address
 * @param userAgent - Browser/device info
 * @returns Refresh token string
 */
export async function generateRefreshToken(
  userId: string,
  ip?: string,
  userAgent?: string,
): Promise<string> {
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + jwtConfig.refreshToken.expiresInMs);

  // Store in database (for tracking & revocation)
  await prisma.userSession.create({
    data: {
      userId,
      sessionToken: refreshToken, // Refresh token store karo
      ipAddress: ip || null,
      userAgent: userAgent || null,
      expiresAt,
      isActive: true,
    },
  });

  return refreshToken;
}

/**
 * Refresh Token verify karo (DB me check)
 *
 * @param refreshToken - Token string
 * @returns User data ya null
 */
export async function verifyRefreshToken(refreshToken: string) {
  const session = await prisma.userSession.findFirst({
    where: {
      sessionToken: refreshToken,
      isActive: true,
      expiresAt: { gt: new Date() }, // Not expired
    },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  return session;
}

/**
 * Refresh Token revoke karo (logout ke liye)
 *
 * @param refreshToken - Token to revoke
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { sessionToken: refreshToken },
    data: { isActive: false },
  });
}

/**
 * User ke saare sessions revoke karo (logout from all devices)
 *
 * @param userId - User ID
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { userId },
    data: { isActive: false },
  });
}

// ============================================
// COMBINED FUNCTIONS
// ============================================

/**
 * Dono tokens generate karo (login ke time)
 *
 * @param user - User object
 * @param ip - IP address
 * @param userAgent - Browser info
 * @returns Both tokens
 */
export async function generateTokenPair(
  user: {
    userId: string;
    mobileNumber: string;
    fullName: string;
    role: string;
  },
  ip?: string,
  userAgent?: string,
): Promise<TokenPair> {
  // 1. Access Token (JWT - short lived)
  const accessToken = generateAccessToken({
    userId: user.userId,
    mobileNumber: user.mobileNumber,
    fullName: user.fullName,
    role: user.role,
  });

  // 2. Refresh Token (UUID - stored in DB)
  const refreshToken = await generateRefreshToken(user.userId, ip, userAgent);

  return { accessToken, refreshToken };
}

/**
 * Access token refresh karo (using refresh token)
 *
 * @param refreshToken - Current refresh token
 * @returns New access token ya null
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  const session = await verifyRefreshToken(refreshToken);

  if (!session || !session.user) {
    return null;
  }

  // Generate new access token
  return generateAccessToken({
    userId: session.user.userId,
    mobileNumber: session.user.mobileNumber,
    fullName: session.user.fullName,
    role: session.user.role,
  });
}
