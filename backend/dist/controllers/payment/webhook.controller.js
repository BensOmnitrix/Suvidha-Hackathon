import crypto from "crypto";
import razorpay from "../../config/razorpay.js";
import { prisma } from "../../lib/prisma.js";
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Verify webhook signature from Razorpay
 */
function verifyWebhookSignature(body, signature, secret) {
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    }
    catch {
        return false;
    }
}
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
// ============================================
// WEBHOOK HANDLER
// ============================================
/**
 * Handles Razorpay webhook events
 *
 * Production considerations:
 * 1. Idempotency - Check if event already processed via razorpayEventId
 * 2. Signature verification - Verify before processing
 * 3. Audit trail - Store all webhook events
 * 4. Transaction safety - Use DB transactions
 * 5. Error handling - Don't fail on non-critical errors
 * 6. Always return 200 - Razorpay retries on non-2xx
 */
export const webhookHandler = async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // Get raw body for signature verification
    // Note: Express needs raw body middleware for webhooks
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    // Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    // Extract IP address
    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket?.remoteAddress ||
        "unknown";
    // Parse payload
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    // Generate event ID for idempotency (Razorpay doesn't always send one)
    const razorpayEventId = `${payload.event}-${payload.payload.payment?.entity?.id || payload.payload.order?.entity?.id}-${payload.created_at}`;
    try {
        // Step 1: Check idempotency - has this event been processed?
        const existingEvent = await prisma.webhookEvent.findUnique({
            where: { razorpayEventId },
        });
        if (existingEvent?.processed) {
            console.log(`[Webhook] Duplicate event ignored: ${razorpayEventId}`);
            return res.status(200).json({ status: "duplicate", ignored: true });
        }
        // Step 2: Store webhook event (audit trail)
        const webhookEvent = await prisma.webhookEvent.upsert({
            where: { razorpayEventId },
            update: {
                verified: isValid,
                // Don't overwrite if already exists
            },
            create: {
                eventType: payload.event,
                razorpayEventId,
                payload: payload.payload,
                rawBody,
                verified: isValid,
                processed: false,
                ipAddress,
                headers: req.headers,
            },
        });
        // Step 3: If signature invalid, log and return (but still 200)
        if (!isValid) {
            console.warn(`[Webhook] Invalid signature for event: ${payload.event}`);
            await prisma.webhookEvent.update({
                where: { eventId: webhookEvent.eventId },
                data: {
                    errorMessage: "Invalid signature",
                },
            });
            return res
                .status(200)
                .json({ status: "ignored", reason: "invalid_signature" });
        }
        // Step 4: Process event based on type
        switch (payload.event) {
            case "payment.captured":
                await handlePaymentCaptured(payload, webhookEvent.eventId);
                break;
            case "payment.failed":
                await handlePaymentFailed(payload, webhookEvent.eventId);
                break;
            case "refund.processed":
                await handleRefundProcessed(payload, webhookEvent.eventId);
                break;
            default:
                console.log(`[Webhook] Unhandled event type: ${payload.event}`);
        }
        // Step 5: Mark event as processed
        await prisma.webhookEvent.update({
            where: { eventId: webhookEvent.eventId },
            data: {
                processed: true,
                processedAt: new Date(),
            },
        });
        return res.status(200).json({ status: "ok" });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Webhook] Error processing event: ${errorMessage}`);
        // Try to log error to webhook event
        try {
            await prisma.webhookEvent.updateMany({
                where: { razorpayEventId },
                data: {
                    errorMessage,
                    processed: false,
                },
            });
        }
        catch {
            // Ignore logging errors
        }
        // Still return 200 to prevent Razorpay retries for application errors
        // Only return 5xx for transient errors that should be retried
        return res.status(200).json({ status: "error", message: errorMessage });
    }
};
// ============================================
// EVENT HANDLERS
// ============================================
/**
 * Handle payment.captured event
 * This is the PRIMARY source of truth for payment success
 */
async function handlePaymentCaptured(payload, webhookEventId) {
    const payment = payload.payload.payment?.entity;
    if (!payment) {
        throw new Error("No payment entity in webhook payload");
    }
    const razorpayOrderId = payment.order_id;
    const razorpayPaymentId = payment.id;
    console.log(`[Webhook] Processing payment.captured: ${razorpayPaymentId}`);
    // Find the PaymentOrder
    const paymentOrder = await prisma.paymentOrder.findUnique({
        where: { razorpayOrderId },
    });
    if (!paymentOrder) {
        // Order not in our system - could be from different integration
        console.warn(`[Webhook] PaymentOrder not found for: ${razorpayOrderId}`);
        return;
    }
    // Already processed?
    if (paymentOrder.status === "paid") {
        console.log(`[Webhook] Order already paid: ${razorpayOrderId}`);
        return;
    }
    // Extract payment details
    const paymentDetails = extractPaymentDetails(payment);
    const receiptNumber = generateReceiptNumber();
    // Get user ID from order or payment notes
    const userId = paymentOrder.userId || payment.notes?.userId || null;
    if (!userId) {
        console.warn(`[Webhook] No userId for payment: ${razorpayPaymentId}`);
    }
    // Transaction: Update everything atomically
    await prisma.$transaction(async (tx) => {
        // 1. Update PaymentOrder
        await tx.paymentOrder.update({
            where: { orderId: paymentOrder.orderId },
            data: {
                razorpayPaymentId,
                status: "paid",
                paidAt: new Date(),
                // Update customer info if available from Razorpay
                customerEmail: payment.email || paymentOrder.customerEmail,
                customerMobile: payment.contact || paymentOrder.customerMobile,
            },
        });
        // 2. Check if Payment record already exists (from verifyPayment)
        const existingPayment = await tx.payment.findUnique({
            where: { transactionId: razorpayPaymentId },
        });
        if (!existingPayment && userId) {
            // 3. Create Payment record
            await tx.payment.create({
                data: {
                    paymentOrderId: paymentOrder.orderId,
                    billId: paymentOrder.billId,
                    userId,
                    transactionId: razorpayPaymentId,
                    paymentMethod: payment.method,
                    paymentGateway: "razorpay",
                    amount: paymentOrder.amount,
                    paymentStatus: "success",
                    gatewayResponse: paymentDetails,
                    paymentDate: new Date(),
                    receiptNumber,
                },
            });
        }
        else if (existingPayment) {
            // Update existing payment with latest details
            await tx.payment.update({
                where: { paymentId: existingPayment.paymentId },
                data: {
                    paymentStatus: "success",
                    gatewayResponse: paymentDetails,
                },
            });
        }
        // 4. Update Bill status if applicable
        if (paymentOrder.billId) {
            await tx.bills.update({
                where: { billId: paymentOrder.billId },
                data: { billStatus: "paid" },
            });
        }
        // 5. Update ServiceRequest if applicable
        if (paymentOrder.serviceRequestId) {
            await tx.serviceRequest.update({
                where: { requestId: paymentOrder.serviceRequestId },
                data: { status: "payment_received" },
            });
        }
        // 6. Create notification for user
        if (userId) {
            await tx.notification.create({
                data: {
                    userId,
                    notificationType: "payment_success",
                    title: "Payment Successful",
                    message: `Your payment of ₹${paymentOrder.amount} has been received. Receipt: ${receiptNumber}`,
                    priority: "normal",
                    relatedEntityType: "Payment",
                    relatedEntityId: razorpayPaymentId,
                    deliveryChannels: ["in_app", "email"],
                },
            });
        }
    });
    console.log(`[Webhook] Payment processed successfully: ${razorpayPaymentId}`);
}
/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payload, webhookEventId) {
    const payment = payload.payload.payment?.entity;
    if (!payment)
        return;
    const razorpayOrderId = payment.order_id;
    console.log(`[Webhook] Processing payment.failed: ${payment.id}`);
    // Find and update PaymentOrder
    const paymentOrder = await prisma.paymentOrder.findUnique({
        where: { razorpayOrderId },
    });
    if (!paymentOrder)
        return;
    await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.paymentOrder.update({
            where: { orderId: paymentOrder.orderId },
            data: {
                status: "failed",
                razorpayPaymentId: payment.id,
                metadata: {
                    ...(paymentOrder.metadata || {}),
                    failureReason: payment.error_description,
                    failureCode: payment.error_code,
                },
            },
        });
        // Notify user
        if (paymentOrder.userId) {
            await tx.notification.create({
                data: {
                    userId: paymentOrder.userId,
                    notificationType: "payment_failed",
                    title: "Payment Failed",
                    message: `Your payment of ₹${paymentOrder.amount} failed. ${payment.error_description || "Please try again."}`,
                    priority: "high",
                    relatedEntityType: "PaymentOrder",
                    relatedEntityId: paymentOrder.orderId,
                    deliveryChannels: ["in_app"],
                },
            });
        }
    });
    console.log(`[Webhook] Payment failure recorded: ${payment.id}`);
}
/**
 * Handle refund.processed event
 */
async function handleRefundProcessed(payload, webhookEventId) {
    // Refund handling - implement based on your refund flow
    console.log(`[Webhook] Refund processed event received`);
    // You would typically:
    // 1. Find the original payment
    // 2. Update PaymentOrder status to 'refunded'
    // 3. Update Payment record
    // 4. Reverse bill status if applicable
    // 5. Notify user
}
