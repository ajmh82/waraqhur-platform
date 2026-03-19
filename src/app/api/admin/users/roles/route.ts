import { apiError, apiSuccess } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-guards";
import { ZodError } from "zod";
import { assignRoleSchema } from "@/services/authorization-schemas";
import {
  assignRoleToUser,
  getAuthorizationSnapshotForUser,
} from "@/services/authorization-service";
import { createAuditLog } from "@/services/audit-log-service";

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
