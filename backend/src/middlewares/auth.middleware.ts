import { type Request, type Response, type NextFunction } from "express";
import {
  verifyAccessToken,
  type AccessTokenPayload,
} from "../services/jwt.service.js";

/**
 * JWT Authentication Middleware
 *
 * Kaise kaam karta hai:
 * 1. Header se token nikalo: "Bearer eyJhbGc..."
 * 2. JWT verify karo (signature check - NO DB QUERY! ⚡)
 * 3. Token valid? → req.user me data daalo
 * 4. Token invalid/expired? → 401 error
 *
 * Ye FAST hai kyunki database query nahi karta!
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Step 1: Extract token from header
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  // Step 2: Verify JWT (no database query!)
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      code: "TOKEN_EXPIRED", // Frontend ko pata chalega refresh karna hai
    });
  }

  // Step 3: Attach user data to request
  req.user = {
    userId: decoded.userId,
    mobileNumber: decoded.mobileNumber,
    fullName: decoded.fullName,
    role: decoded.role,
  };

  next();
}

/**
 * Optional Authentication
 * Token hai to user attach karo, nahi hai to bhi chalega
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyAccessToken(token);

    if (decoded) {
      req.user = {
        userId: decoded.userId,
        mobileNumber: decoded.mobileNumber,
        fullName: decoded.fullName,
        role: decoded.role,
      };
    }
  }

  next();
}

/**
 * Role-based Authorization
 * Check if user has required role
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
}
