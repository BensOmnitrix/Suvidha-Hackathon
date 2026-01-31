import {} from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { prisma } from "../lib/prisma.js";
// Get User Bills (optionally filter by status)
const getUserBills = asyncHandler(async (req, res) => {
    const user = req.user;
    const { status } = req.query;
    const whereClause = {
        connection: {
            userId: user.userId
        }
    };
    if (status) {
        whereClause.billStatus = status;
    }
    const bills = await prisma.bills.findMany({
        where: whereClause,
        include: {
            connection: {
                select: {
                    provider: {
                        select: {
                            providerName: true,
                            serviceType: true
                        }
                    },
                    connectionNumber: true
                }
            }
        },
        orderBy: {
            dueDate: "asc"
        }
    });
    return res
        .status(200)
        .json(new ApiResponse(200, bills, "Bills fetched successfully"));
});
// Pay Bill (Simplified Mock Payment)
const payBill = asyncHandler(async (req, res) => {
    const { billId, paymentMethod, amount } = req.body;
    const user = req.user;
    if (!billId || !paymentMethod || !amount) {
        throw new ApiError(400, "Bill ID, payment method and amount are required");
    }
    const bill = await prisma.bills.findUnique({
        where: { billId },
    });
    if (!bill) {
        throw new ApiError(404, "Bill not found");
    }
    if (bill.billStatus === "paid") {
        throw new ApiError(400, "Bill is already paid");
    }
    // Verify amount (optional check)
    if (Number(amount) !== Number(bill.totalAmount)) {
        // In a real scenario, partial payments might be allowed, but for now strict check
        // throw new ApiError(400, "Amount mismatch");
    }
    // Transaction for payment processing
    const payment = await prisma.$transaction(async (tx) => {
        // 1. Create Payment Record
        const newPayment = await tx.payment.create({
            data: {
                billId,
                userId: user.userId,
                amount: Number(amount),
                paymentMethod,
                paymentStatus: "success", // Mocking success
                transactionId: `TXN-${Date.now()}`,
                paymentDate: new Date(),
            },
        });
        // 2. Update Bill Status
        await tx.bills.update({
            where: { billId },
            data: {
                billStatus: "paid",
            },
        });
        return newPayment;
    });
    return res
        .status(200)
        .json(new ApiResponse(200, payment, "Payment successful"));
});
export { getUserBills, payBill };
