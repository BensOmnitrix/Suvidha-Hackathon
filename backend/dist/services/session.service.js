import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
export async function createUserSession(userId, ip, userAgent) {
    const token = crypto.randomUUID();
    return prisma.userSession.create({
        data: {
            userId,
            sessionToken: token,
            ipAddress: ip || null,
            userAgent: userAgent || null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
    });
}
