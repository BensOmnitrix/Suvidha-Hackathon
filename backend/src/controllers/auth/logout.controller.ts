import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

export async function logout(req: Request, res: Response) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    await prisma.userSession.updateMany({
      where: { sessionToken: token },
      data: { isActive: false, endedAt: new Date() },
    });
  }

  res.status(200).json({ success: true });
}
