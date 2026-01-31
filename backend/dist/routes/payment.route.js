import { Router, raw } from "express";
import { createOrder, verifyPayment, getUserPayments, getPaymentById, } from "../controllers/payment/payment.controller.js";
import { webhookHandler } from "../controllers/payment/webhook.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createOrderSchema, verifyPaymentSchema, } from "../validators/payment.validators.js";
const router = Router();
// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================
// Create a new payment order
router.post("/orders", authenticate, validate(createOrderSchema), createOrder);
// Verify payment after Razorpay checkout
router.post("/verify", authenticate, validate(verifyPaymentSchema), verifyPayment);
// Get all payments for authenticated user
router.get("/", authenticate, getUserPayments);
// Get specific payment details
router.get("/:paymentId", authenticate, getPaymentById);
// ============================================
// WEBHOOK ROUTE (no auth - verified by signature)
// ============================================
// Razorpay webhook endpoint
// IMPORTANT: Use raw body parser for signature verification
router.post("/webhook", raw({ type: "application/json" }), webhookHandler);
export default router;
