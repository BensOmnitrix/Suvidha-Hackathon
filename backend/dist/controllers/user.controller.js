import {} from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { prisma } from "../lib/prisma.js";
// Get current user details
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, user, "User fetched successfully"));
});
// Update user details
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email, preferredLanguage } = req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }
    const user = await prisma.user.update({
        where: {
            userId: req.user?.userId,
        },
        data: {
            fullName,
            email,
            preferredLanguage
        },
    });
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});
export { getCurrentUser, updateAccountDetails };
