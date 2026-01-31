import crypto from "crypto";
import razorpay from "../../config/razorpay.js";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createAuditLog } from "../../services/audit.service.js";
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Extract payment details based on payment method
 */
function extractPaymentDetails(payment) {
    const base = {
        method: payment.method,
        payment_id_short: payment.id.slice(-8),
    };
    switch (payment.method) {
        case "upi":
            return {
                ...base,
                upi_id: payment.vpa,
                vpa: payment.vpa,
                bank_name: payment.bank,
                utr: payment.acquirer_data?.rrn || null,
            };
        case "card":
            return {
                ...base,
                card_last4: payment.card?.last4 || null,
                card_type: payment.card?.type || null,
                card_network: payment.card?.network || null,
                bank_name: payment.bank,
            };
        case "netbanking":
            return {
                ...base,
                bank_name: payment.bank,
            };
        case "wallet":
            return {
                ...base,
                wallet_name: payment.wallet,
            };
        default:
            return base;
    }
}
/**
 * Generate unique receipt number
 */
function generateReceiptNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RCP-${timestamp}-${random}`;
}
/**
 * Verify Razorpay signature
 */
function verifySignature(orderId, paymentId, signature, secret) {
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}
// ============================================
// CREATE ORDER
// ============================================
/**
 * Creates a Razorpay order and stores PaymentOrder in DB
 *
 * Flow:
 * 1. Validate input
 * 2. Verify bill/serviceRequest exists (if applicable)
 * 3. Create Razorpay order
 * 4. Store PaymentOrder in DB
 * 5. Return order details for frontend checkout
 */
export const createOrder = asyncHandler(async (req, res) => {
    const { amount, paymentFor, billId, serviceRequestId, customerName, customerEmail, customerMobile, metadata, } = req.body;
    const userId = req.user?.userId;
    // Verify bill exists if bill payment
    if (paymentFor === "bill_payment" && billId) {
        const bill = await prisma.bills.findUnique({
            where: { billId },
            select: { billId: true, totalAmount: true, billStatus: true },
        });
        if (!bill) {
            return res.status(404).json({ error: "Bill not found" });
        }
        if (bill.billStatus === "paid") {
            return res.status(400).json({ error: "Bill is already paid" });
        }
    }
    // Verify service request exists if new connection
    if (paymentFor === "new_connection" && serviceRequestId) {
        const serviceRequest = await prisma.serviceRequest.findUnique({
            where: { requestId: serviceRequestId },
            select: { requestId: true, status: true },
        });
        if (!serviceRequest) {
            return res.status(404).json({ error: "Service request not found" });
        }
    }
    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert ₹ to paisa
        currency: "INR",
        payment_capture: true,
        notes: {
            userId: userId || "",
            paymentFor,
            billId: billId || "",
            serviceRequestId: serviceRequestId || "",
            customerEmail: customerEmail || "",
            customerName: customerName || "",
        },
    });
    // Calculate expiry (30 minutes from now - Razorpay default)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    // Store PaymentOrder in DB
    const paymentOrder = await prisma.paymentOrder.create({
        data: {
            paymentFor,
            billId: billId || null,
            serviceRequestId: serviceRequestId || null,
            userId: userId || null,
            customerName: customerName || null,
            customerEmail: customerEmail || null,
            customerMobile: customerMobile || null,
            razorpayOrderId: razorpayOrder.id,
            amount,
            currency: "INR",
            status: "created",
            expiresAt,
            metadata: metadata ?? undefined,
        },
    });
    // Audit log
    await createAuditLog("PaymentOrder", paymentOrder.orderId, "CREATE", userId || "system");
    return res.status(201).json({
        orderId: paymentOrder.orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: Number(razorpayOrder.amount),
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
    });
});
// ============================================
// VERIFY PAYMENT
// ============================================
/**
 * Verifies payment after Razorpay checkout
 *
 * Flow:
 * 1. Verify Razorpay signature
 * 2. Fetch payment details from Razorpay
 * 3. Update PaymentOrder status
 * 4. Create Payment record
 * 5. Update Bill status (if bill payment)
 * 6. All in a transaction for consistency
 */
export const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user?.userId;
    // Step 1: Verify signature
    const isValidSignature = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, process.env.RAZORPAY_KEY_SECRET);
    if (!isValidSignature) {
        return res.status(400).json({
            error: "Invalid payment signature. Verification failed.",
        });
    }
    // Step 2: Find the PaymentOrder
    const paymentOrder = await prisma.paymentOrder.findUnique({
        where: { razorpayOrderId: razorpay_order_id },
        include: { bill: true },
    });
    if (!paymentOrder) {
        return res.status(404).json({ error: "Order not found" });
    }
    if (paymentOrder.status === "paid") {
        return res.status(200).json({
            success: true,
            message: "Payment already verified",
            orderId: paymentOrder.orderId,
            paymentId: razorpay_payment_id,
        });
    }
    // Step 3: Fetch payment details from Razorpay
    const razorpayPayment = (await razorpay.payments.fetch(razorpay_payment_id));
    const paymentDetails = extractPaymentDetails(razorpayPayment);
    const receiptNumber = generateReceiptNumber();
    // Step 4: Transaction - Update PaymentOrder, Create Payment, Update Bill
    const result = await prisma.$transaction(async (tx) => {
        // Update PaymentOrder
        const updatedOrder = await tx.paymentOrder.update({
            where: { orderId: paymentOrder.orderId },
            data: {
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: "paid",
                paidAt: new Date(),
            },
        });
        // Create Payment record
        const payment = await tx.payment.create({
            data: {
                paymentOrderId: paymentOrder.orderId,
                billId: paymentOrder.billId,
                userId: userId || paymentOrder.userId,
                transactionId: razorpay_payment_id,
                paymentMethod: razorpayPayment.method,
                paymentGateway: "razorpay",
                amount: paymentOrder.amount,
                paymentStatus: "success",
                gatewayResponse: paymentDetails,
                paymentDate: new Date(),
                receiptNumber,
            },
        });
        // Update Bill status if this is a bill payment
        if (paymentOrder.billId) {
            await tx.bills.update({
                where: { billId: paymentOrder.billId },
                data: { billStatus: "paid" },
            });
        }
        // Update ServiceRequest if this is a new connection payment
        if (paymentOrder.serviceRequestId) {
            await tx.serviceRequest.update({
                where: { requestId: paymentOrder.serviceRequestId },
                data: { status: "payment_received" },
            });
        }
        return { order: updatedOrder, payment };
    });
    // Audit log
    await createAuditLog("Payment", result.payment.paymentId, "PAYMENT_VERIFIED", userId || "system");
    return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        orderId: paymentOrder.orderId,
        paymentId: result.payment.paymentId,
        receiptNumber,
    });
});
// ============================================
// GET USER PAYMENTS
// ============================================
/**
 * Get all payments for the authenticated user
 */
export const getUserPayments = asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const payments = await prisma.payment.findMany({
        where: { userId },
        include: {
            paymentOrder: {
                select: {
                    paymentFor: true,
                    customerName: true,
                    customerEmail: true,
                },
            },
            bill: {
                select: {
                    billNumber: true,
                    billingPeriodStart: true,
                    billingPeriodEnd: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ payments });
});
// ============================================
// GET PAYMENT BY ID
// ============================================
/**
 * Get single payment details
 */
export const getPaymentById = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const userId = req.user?.userId;
    const payment = await prisma.payment.findUnique({
        where: { paymentId },
        include: {
            paymentOrder: true,
            bill: {
                include: {
                    connection: {
                        include: { provider: true },
                    },
                },
            },
        },
    });
    if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
    }
    // Check ownership (unless admin)
    if (payment.userId !== userId && !req.user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
    }
    return res.status(200).json({ payment });
});
