import { type Request,type Response } from "express";
import { generateAndStoreOTP, verifyOTP } from "../../services/otp.service.js";
import { prisma } from "../../lib/prisma.js";
import { createUserSession } from "../../services/session.service.js";

export async function sendOTP(req: Request, res: Response) {
  const { mobileNumber, purpose } = req.body;

  if (!mobileNumber || !purpose) {
    return res.status(400).json({ message: "Invalid request" });
  }

  await generateAndStoreOTP(mobileNumber, purpose);

  return res.status(200).json({
    success: true,
    message: "OTP sent successfully",
  });
}

export async function signup(req: Request, res: Response) {
  const {
    mobileNumber,
    otp,
    citizenId,
    fullName,
    email,
    dateOfBirth,
    address,
  } = req.body;

  const otpValid = await verifyOTP(mobileNumber, otp, "registration");
  if (!otpValid) {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  const existingUser = await prisma.user.findFirst({
    where: { mobileNumber },
  });

  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  const user = await prisma.user.create({
    data: {
      mobileNumber,
      citizenId,
      fullName,
      email,
      dateOfBirth,
      address,
    },
  });

  const session = await createUserSession(
    user.userId,
    req.ip,
    req.headers["user-agent"]
  );

  return res.status(201).json({
    success: true,
    user,
    sessionToken: session.sessionToken,
  });
}