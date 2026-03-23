import { apiError, apiSuccess } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-guards";
import { prisma } from "@/lib/prisma";
import { ZodError, z } from "zod";
import { assignRoleSchema } from "@/services/authorization-schemas";
import {
  assignRoleToUser,
  getAuthorizationSnapshotForUser,
} from "@/services/authorization-service";
import { createAuditLog } from "@/services/audit-log-service";

const removeRoleSchema = z.object({
  userId: z.string().min(1),
  roleKey: z.string().min(1),
});

export async function POST(request: Request) {
  const guard = await requirePermission("users.manage");

  if (!guard.ok) {
    return apiError(guard.code, guard.message, guard.status);
  }

  const current = { user: guard.user };

  try {
    const body = await request.json();
    const input = assignRoleSchema.parse(body);

    const assignment = await assignRoleToUser({
      userId: input.userId,
      roleKey: input.roleKey,
      assignedByUserId: current.user.id,
    });

    const authorization = await getAuthorizationSnapshotForUser(input.userId);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "USER_ROLE_ASSIGNED",
      targetType: "USER",
      targetId: input.userId,
      metadata: {
        roleKey: input.roleKey,
        assignmentId: assignment.id,
        roles: authorization.roles,
        permissions: authorization.permissions,
      },
    });

    return apiSuccess({
      data: {
        assignment,
        authorization,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid role assignment payload",
        400,
        error.flatten()
      );
    }

    return apiError(
      "ROLE_ASSIGNMENT_FAILED",
      error instanceof Error ? error.message : "Role assignment failed",
      400
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requirePermission("users.manage");

  if (!guard.ok) {
    return apiError(guard.code, guard.message, guard.status);
  }

  const current = { user: guard.user };

  try {
    const body = await request.json();
    const input = removeRoleSchema.parse(body);

    const role = await prisma.role.findUnique({
      where: {
        key: input.roleKey,
      },
      select: {
        id: true,
        key: true,
        name: true,
      },
    });

    if (!role) {
      return apiError("ROLE_NOT_FOUND", "Role not found", 404);
    }

    const removed = await prisma.userRole.deleteMany({
      where: {
        userId: input.userId,
        roleId: role.id,
      },
    });

    if (removed.count === 0) {
      return apiError(
        "USER_ROLE_NOT_FOUND",
        "Role assignment not found for this user",
        404
      );
    }

    const authorization = await getAuthorizationSnapshotForUser(input.userId);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "USER_ROLE_REMOVED",
      targetType: "USER",
      targetId: input.userId,
      metadata: {
        roleKey: role.key,
        roleName: role.name,
        roles: authorization.roles,
        permissions: authorization.permissions,
      },
    });

    return apiSuccess({
      data: {
        removed: {
          userId: input.userId,
          roleKey: role.key,
          roleName: role.name,
        },
        authorization,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid role removal payload",
        400,
        error.flatten()
      );
    }

    return apiError(
      "ROLE_REMOVAL_FAILED",
      error instanceof Error ? error.message : "Role removal failed",
      400
    );
  }
}
