import crypto from "crypto";
import { prisma } from "../lib/prisma.js";

export async function generateAndStoreOTP(
  mobileNumber: string,
  purpose: "login" | "registration",
) {
  const otp = crypto.randomInt(100000, 999999).toString();

  await prisma.otpVerification.create({
    data: {
      mobileNumber,
      otpCode: otp,
      purpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    },
  });

  // integrate SMS gateway
  console.log(`OTP for ${mobileNumber}: ${otp}`);

  return true;
}

export async function verifyOTP(
  mobileNumber: string,
  otpCode: string,
  purpose: string
) {
  const record = await prisma.otpVerification.findFirst({
    where: {
      mobileNumber,
      otpCode,
      purpose,
      isVerified: false,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;

  await prisma.otpVerification.update({
    where: { otpId: record.otpId },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  return true;
}