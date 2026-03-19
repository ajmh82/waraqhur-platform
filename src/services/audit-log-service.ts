import { prisma } from "@/lib/prisma";

export interface CreateAuditLogInput {
  actorUserId?: string | null;
  actorType?: "USER" | "SYSTEM" | "SERVICE";
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createAuditLog(input: CreateAuditLogInput) {
  const auditLog = await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType ?? "USER",
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? null,
    },
  });

  return {
    id: auditLog.id,
    actorUserId: auditLog.actorUserId,
    actorType: auditLog.actorType,
    action: auditLog.action,
    targetType: auditLog.targetType,
    targetId: auditLog.targetId,
    metadata: auditLog.metadata,
    createdAt: auditLog.createdAt.toISOString(),
  };
}

export async function listAuditLogs() {
  const auditLogs = await prisma.auditLog.findMany({
    include: {
      actorUser: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return auditLogs.map((entry) => ({
    id: entry.id,
    actorUserId: entry.actorUserId,
    actorType: entry.actorType,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: entry.metadata,
    createdAt: entry.createdAt.toISOString(),
    actorUser: entry.actorUser
      ? {
          id: entry.actorUser.id,
          email: entry.actorUser.email,
          username: entry.actorUser.username,
        }
      : null,
  }));
}
