import type { PaymentFor, PaymentOrderStatus, PaymentStatus } from '../generated/prisma/client.js';

// ============================================
// RAZORPAY API TYPES
// ============================================

export interface RazorpayOrderCreateOptions {
  amount: number; // in paisa
  currency: string;
  receipt?: string;
  payment_capture?: 0 | 1;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id: string;
  method: "card" | "upi" | "netbanking" | "wallet" | "emi" | "bank_transfer";
  description: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null; // UPI VPA
  email: string;
  contact: string;
  notes: Record<string, string>;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  created_at: number;
  card?: {
    id: string;
    entity: "card";
    name: string;
    last4: string;
    network: string;
    type: string;
    issuer: string | null;
  };
  acquirer_data?: {
    rrn?: string; // UTR for UPI
    auth_code?: string;
  };
}

// ============================================
// WEBHOOK TYPES
// ============================================

export interface RazorpayWebhookPayload {
  entity: "event";
  account_id: string;
  event: RazorpayWebhookEvent;
  contains: string[];
  payload: {
    payment?: {
      entity: RazorpayPayment;
    };
    order?: {
      entity: RazorpayOrder;
    };
  };
  created_at: number;
}

export type RazorpayWebhookEvent =
  | "payment.authorized"
  | "payment.captured"
  | "payment.failed"
  | "order.paid"
  | "refund.created"
  | "refund.processed";

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateOrderRequest {
  amount: number; // in ₹
  paymentFor: PaymentFor;
  billId?: string;
  serviceRequestId?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOrderResponse {
  orderId: string; // Our DB order ID
  razorpayOrderId: string;
  amount: number; // in paisa
  currency: string;
  keyId: string; // Razorpay key for frontend
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  orderId: string;
  paymentId: string;
  receiptNumber?: string;
}

// ============================================
// PAYMENT DETAILS (stored in gatewayResponse)
// ============================================

export interface PaymentDetails {
  method: string;
  // UPI
  upi_id?: string | null;
  vpa?: string | null;
  utr?: string | null; // Unique Transaction Reference
  // Card
  card_last4?: string | null;
  card_type?: string | null;
  card_network?: string | null;
  // Netbanking/General
  bank_name?: string | null;
  account_last4?: string | null;
  // Wallet
  wallet_name?: string | null;
  // Fallback reference
  payment_id_short?: string | null;
}

// ============================================
// INTERNAL TYPES
// ============================================

export interface PaymentOrderCreateData {
  paymentFor: PaymentFor;
  billId?: string | null;
  serviceRequestId?: string | null;
  userId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerMobile?: string | null;
  razorpayOrderId: string;
  amount: number; // in ₹ (Decimal)
  currency: string;
  status: PaymentOrderStatus;
  expiresAt: Date;
  metadata?: Record<string, unknown> | null;
}

export interface PaymentCreateData {
  paymentOrderId: string;
  billId?: string | null;
  userId: string;
  transactionId: string; // razorpay_payment_id
  paymentMethod?: string | null;
  paymentGateway: string;
  amount: number;
  paymentStatus: PaymentStatus;
  gatewayResponse?: PaymentDetails | null;
  paymentDate: Date;
  receiptNumber?: string | null;
}
