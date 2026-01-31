import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createComplaintSchema } from "../validators/complaint.validators.js";
import {
  createComplaint,
  getUserComplaints,
} from "../controllers/complaint/complaint.controller.js";
import { authorize, requireAdmin } from "../middlewares/rbac.middleware.js";

export const complaintRouter = Router();

// All routes need authentication
complaintRouter.use(authenticate);

// ============================================
// CITIZEN ROUTES - Citizens can create & view their complaints
// ============================================

// Create complaint - citizens and kiosk operators
complaintRouter.post(
  "/",
  authorize("citizen", "kiosk_operator"),
  validate(createComplaintSchema),
  createComplaint,
);

// Get my complaints - citizens
complaintRouter.get(
  "/my-complaints",
  authorize("citizen", "kiosk_operator"),
  getUserComplaints,
);

// ============================================
// ADMIN ROUTES - Admins can manage all complaints
// ============================================

// Get all complaints (admin only)
// complaintRouter.get("/all", requireAdmin, getAllComplaints);

// Update complaint status (admin only)
// complaintRouter.patch("/:complaintId/status", requireAdmin, updateComplaintStatus);

// Assign complaint to officer (admin only)
// complaintRouter.patch("/:complaintId/assign", requireAdmin, assignComplaint);
