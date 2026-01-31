import { type Request, type Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { prisma } from "../lib/prisma.js";

// Create a new Complaint
const createComplaint = asyncHandler(async (req: Request, res: Response) => {
    const { subject, description, complaintCategory, locationDetails, priority } = req.body;
    const user = req.user;

    if (!subject || !description || !complaintCategory) {
        throw new ApiError(400, "Subject, description and category are required");
    }

    const complaintNumber = `CMP-${Date.now()}`;

    const complaint = await prisma.complaint.create({
        data: {
            userId: user!.userId,
            subject,
            description,
            complaintCategory,
            complaintNumber,
            locationDetails,
            priority: priority || "normal",
            status: "open",
        },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, complaint, "Complaint registered successfully"));
});

// Get User Complaints
const getUserComplaints = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;

    const complaints = await prisma.complaint.findMany({
        where: {
            userId: user!.userId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, complaints, "Complaints fetched successfully"));
});

export { createComplaint, getUserComplaints };
