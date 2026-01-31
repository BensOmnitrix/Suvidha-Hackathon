/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Ye middleware check karta hai ki user ke paas required role hai ya nahi.
 *
 * Usage:
 *   router.get("/admin/users", authenticate, authorize("admin", "super_admin"), getUsers);
 *   router.post("/complaints", authenticate, authorize("citizen", "kiosk_operator"), createComplaint);
 */

import type { Request, Response, NextFunction } from "express";

// Define all roles (must match Prisma enum)
export type UserRole = "citizen" | "kiosk_operator" | "admin" | "super_admin";

// Role hierarchy - higher roles have more permissions
const roleHierarchy: Record<UserRole, number> = {
  citizen: 1,
  kiosk_operator: 2,
  admin: 3,
  super_admin: 4,
};

/**
 * Check if user has one of the allowed roles
 *
 * @param allowedRoles - Roles that can access this route
 * @returns Express middleware
 *
 * Example:
 *   authorize("admin", "super_admin")  // Only admin and super_admin can access
 *   authorize("citizen")               // Only citizens can access
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user exists (authenticate middleware should run first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role as UserRole;

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You don't have permission to access this resource.",
        requiredRoles: allowedRoles,
        yourRole: userRole,
      });
    }

    next();
  };
}

/**
 * Check if user's role is at least the minimum required level
 * Uses role hierarchy
 *
 * @param minimumRole - Minimum role level required
 * @returns Express middleware
 *
 * Example:
 *   authorizeMinRole("admin")  // admin and super_admin can access
 *   authorizeMinRole("kiosk_operator")  // kiosk_operator, admin, super_admin can access
 */
export function authorizeMinRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role as UserRole;
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[minimumRole];

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Minimum role required: ${minimumRole}`,
        yourRole: userRole,
      });
    }

    next();
  };
}

/**
 * Check if user is accessing their own resource
 *
 * @param paramName - URL param name containing user ID (default: "userId")
 * @returns Express middleware
 *
 * Example:
 *   router.get("/users/:userId", authenticate, authorizeOwnerOrAdmin("userId"), getUser);
 */
export function authorizeOwnerOrAdmin(paramName: string = "userId") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const resourceUserId = req.params[paramName];
    const currentUserId = req.user.userId;
    const userRole = req.user.role as UserRole;

    // Allow if user is admin/super_admin OR accessing own resource
    const isAdmin = userRole === "admin" || userRole === "super_admin";
    const isOwner = resourceUserId === currentUserId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own resources.",
      });
    }

    next();
  };
}

/**
 * Shortcut middlewares for common role checks
 */
export const requireCitizen = authorize(
  "citizen",
  "kiosk_operator",
  "admin",
  "super_admin",
);
export const requireKioskOperator = authorize(
  "kiosk_operator",
  "admin",
  "super_admin",
);
export const requireAdmin = authorize("admin", "super_admin");
export const requireSuperAdmin = authorize("super_admin");
