import {} from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { prisma } from "../../lib/prisma.js";
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
export { getUserBills };
