import { prisma } from "../../lib/prisma.js";
import { verifyOTP } from "../../services/otp.service.js";
import { type Request, type Response } from "express";
import { createUserSession } from "../../services/session.service.js";

export async function signin(req: Request, res: Response) {
  const { mobileNumber, otp } = req.body;

  const otpValid = await verifyOTP(mobileNumber, otp, "login");
  if (!otpValid) {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  const user = await prisma.user.findFirst({
    where: { mobileNumber, isActive: true },
  });

  if (!user) {
    return res.status(404).json({ message: "User not registered" });
  }

  const session = await createUserSession(
    user.userId,
    req.ip,
    req.headers["user-agent"]
  );

  await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLoginAt: new Date() },
  });

  return res.status(200).json({
    success: true,
    user,
    sessionToken: session.sessionToken,
  });
}
