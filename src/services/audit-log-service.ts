import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreateAuditLogInput {
  actorUserId?: string | null;
  actorType?: "USER" | "SYSTEM" | "SERVICE";
  action: string;
  targetType: string;
  targetId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(input: CreateAuditLogInput) {
  const auditLog = await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType ?? "USER",
      action: input.action,
      entityType: input.targetType,
      entityId: input.targetId ?? null,
      summary: input.summary ?? null,
      metadata:
        input.metadata === undefined
          ? undefined
          : input.metadata === null
            ? Prisma.JsonNull
            : (input.metadata as unknown as Prisma.InputJsonValue),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return {
    id: auditLog.id,
    actorUserId: auditLog.actorUserId,
    actorType: auditLog.actorType,
    action: auditLog.action,
    targetType: auditLog.entityType,
    targetId: auditLog.entityId,
    summary: auditLog.summary,
    metadata: auditLog.metadata,
    ipAddress: auditLog.ipAddress,
    userAgent: auditLog.userAgent,
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
    targetType: entry.entityType,
    targetId: entry.entityId,
    summary: entry.summary,
    metadata: entry.metadata,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
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
