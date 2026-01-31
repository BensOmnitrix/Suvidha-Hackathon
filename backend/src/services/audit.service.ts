import { prisma } from "../lib/prisma.js";

// Call inside signup, signin, logout to log on the console => Pending work to be done

export async function createAuditLog(
  entityType: string,
  entityId: string,
  action: string,
  performedBy?: string
) {
  return prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      performedBy: performedBy || null,
    },
  });
}
