import { type Request, type Response, type NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const session = await prisma.userSession.findFirst({
    where: {
      sessionToken: token,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session) {
    return res.status(401).json({ message: "Invalid session" });
  }

  req.user = session.user;
  next();
}
