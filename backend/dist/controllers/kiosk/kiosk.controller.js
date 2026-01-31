import {} from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { prisma } from "../../lib/prisma.js";
// Register a new Kiosk
const registerKiosk = asyncHandler(async (req, res) => {
    const { kioskCode, locationName, address, locationType } = req.body;
    if (!kioskCode || !locationName || !address) {
        throw new ApiError(400, "All fields are required");
    }
    const existingKiosk = await prisma.kiosk.findUnique({
        where: { kioskCode },
    });
    if (existingKiosk) {
        throw new ApiError(409, "Kiosk with this code already exists");
    }
    const kiosk = await prisma.kiosk.create({
        data: {
            kioskCode,
            locationName,
            address,
            locationType,
            isOperational: true,
            status: "active",
        },
    });
    return res
        .status(201)
        .json(new ApiResponse(201, kiosk, "Kiosk registered successfully"));
});
// Update Kiosk Status
const updateKioskStatus = asyncHandler(async (req, res) => {
    const kioskId = req.params.kioskId;
    const { status, isOperational } = req.body;
    const kiosk = await prisma.kiosk.findUnique({
        where: { kioskId },
    });
    if (!kiosk) {
        throw new ApiError(404, "Kiosk not found");
    }
    const updateData = {};
    if (status !== undefined)
        updateData.status = status;
    if (isOperational !== undefined)
        updateData.isOperational = isOperational;
    const updatedKiosk = await prisma.kiosk.update({
        where: { kioskId },
        data: updateData,
    });
    return res
        .status(200)
        .json(new ApiResponse(200, updatedKiosk, "Kiosk status updated successfully"));
});
// Get all Kiosks
const getAllKiosks = asyncHandler(async (req, res) => {
    const kiosks = await prisma.kiosk.findMany();
    return res
        .status(200)
        .json(new ApiResponse(200, kiosks, "Kiosks fetched successfully"));
});
export { registerKiosk, updateKioskStatus, getAllKiosks };
