import { apiError, apiSuccess } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-guards";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/services/audit-log-service";

const updateUserStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function PATCH(request: Request) {
  const guard = await requirePermission("users.manage");

  if (!guard.ok) {
    return apiError(guard.code, guard.message, guard.status);
  }

  const current = { user: guard.user };

  try {

    const body = await request.json();
    const input = updateUserStatusSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: {
        id: input.userId,
      },
      data: {
        status: input.status,
      },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
          orderBy: {
            assignedAt: "asc",
          },
        },
        sessions: {
          orderBy: {
            lastUsedAt: "desc",
          },
          take: 1,
        },
      },
    });

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: input.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_ACTIVATED",
      targetType: "USER",
      targetId: updatedUser.id,
      metadata: {
        email: updatedUser.email,
        username: updatedUser.username,
        status: updatedUser.status,
      },
    });

    return apiSuccess({
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          status: updatedUser.status,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
          profile: updatedUser.profile
            ? {
                displayName: updatedUser.profile.displayName,
              }
            : null,
          roles: updatedUser.userRoles.map((entry) => ({
            key: entry.role.key,
            name: entry.role.name,
            assignedAt: entry.assignedAt.toISOString(),
          })),
          lastActivityAt: updatedUser.sessions[0]?.lastUsedAt
            ? updatedUser.sessions[0].lastUsedAt.toISOString()
            : null,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid user status payload",
        400,
        error.flatten()
      );
    }

    return apiError(
      "ADMIN_USER_STATUS_UPDATE_FAILED",
      error instanceof Error ? error.message : "Failed to update user status",
      400
    );
  }
}
