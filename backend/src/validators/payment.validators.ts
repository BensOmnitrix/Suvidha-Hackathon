import { z } from 'zod';
import { PaymentFor } from '../generated/prisma/client.js';

// ============================================
// CREATE ORDER VALIDATION
// ============================================

export const createOrderSchema = z.object({
  body: z.object({
    amount: z
      .number({ message: "Amount is required" })
      .positive({ message: "Amount must be greater than 0" })
      .max(10000000, { message: "Amount exceeds maximum limit" }), // ₹1 Crore limit
    
    paymentFor: z.enum(
      ["bill_payment", "new_connection", "security_deposit", "reconnection_fee", "miscellaneous"] as const,
      { message: "Invalid payment purpose" }
    ),
    
    billId: z.string().uuid({ message: "Invalid bill ID" }).optional(),
    serviceRequestId: z.string().uuid({ message: "Invalid service request ID" }).optional(),
    
    customerName: z.string().min(1).max(100).optional(),
    customerEmail: z.string().email({ message: "Invalid email" }).optional(),
    customerMobile: z
      .string()
      .regex(/^[6-9]\d{9}$/, { message: "Invalid mobile number" })
      .optional(),
    
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).refine(
    (data) => {
      // billId required for bill_payment
      if (data.paymentFor === "bill_payment" && !data.billId) {
        return false;
      }
      // serviceRequestId required for new_connection
      if (data.paymentFor === "new_connection" && !data.serviceRequestId) {
        return false;
      }
      return true;
    },
    {
      message: "billId is required for bill payments, serviceRequestId is required for new connections",
    }
  ),
});

// ============================================
// VERIFY PAYMENT VALIDATION
// ============================================

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z
      .string({ message: "Razorpay order ID is required" })
      .startsWith("order_", { message: "Invalid Razorpay order ID format" }),
    
    razorpay_payment_id: z
      .string({ message: "Razorpay payment ID is required" })
      .startsWith("pay_", { message: "Invalid Razorpay payment ID format" }),
    
    razorpay_signature: z
      .string({ message: "Razorpay signature is required" })
      .length(64, { message: "Invalid signature length" }),
  }),
});

// ============================================
// GET PAYMENTS VALIDATION
// ============================================

export const getPaymentsQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(PaymentFor).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});

// Type exports for controllers
export type CreateOrderInput = z.infer<typeof createOrderSchema>["body"];
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>["body"];
export type GetPaymentsQuery = z.infer<typeof getPaymentsQuerySchema>["query"];
