
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";

export async function createUserSession(
  userId: string,
  ip?: string,
  userAgent?: string
) {
  const token = crypto.randomUUID();

  return prisma.userSession.create({
    data: {
      userId,
      sessionToken: token,
      ipAddress: ip,
      userAgent,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });
}
