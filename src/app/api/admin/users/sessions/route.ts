import { apiError, apiSuccess } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-guards";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit-log-service";
import { z } from "zod";

const revokeUserSessionSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
});

export async function DELETE(request: Request) {
  const guard = await requirePermission("users.manage");

  if (!guard.ok) {
    return apiError(guard.code, guard.message, guard.status);
  }

  const current = { user: guard.user };

  try {
    const body = await request.json();
    const input = revokeUserSessionSchema.parse(body);

    const session = await prisma.userSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!session) {
      return apiError("SESSION_NOT_FOUND", "Session not found", 404);
    }

    await prisma.userSession.delete({
      where: {
        id: session.id,
      },
    });

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "USER_SESSION_REVOKED",
      targetType: "USER",
      targetId: input.userId,
      metadata: {
        sessionId: input.sessionId,
      },
    });

    return apiSuccess({
      data: {
        revoked: true,
        sessionId: input.sessionId,
        userId: input.userId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid user session revoke payload",
        400,
        error.flatten()
      );
    }

    return apiError(
      "ADMIN_USER_SESSION_REVOKE_FAILED",
      error instanceof Error ? error.message : "Failed to revoke user session",
      400
    );
  }
}
