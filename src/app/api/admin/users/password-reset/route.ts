import { apiError, apiSuccess } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-guards";
import { z } from "zod";
import { requestPasswordReset } from "@/services/auth-recovery-service";
import { createAuditLog } from "@/services/audit-log-service";

const adminPasswordResetSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const guard = await requirePermission("users.manage");

  if (!guard.ok) {
    return apiError(guard.code, guard.message, guard.status);
  }

  const current = { user: guard.user };

  try {

    const body = await request.json();
    const input = adminPasswordResetSchema.parse(body);

    await requestPasswordReset(input.email);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "USER_PASSWORD_RESET_REQUESTED",
      targetType: "USER",
      targetId: null,
      metadata: {
        email: input.email,
      },
    });

    return apiSuccess({
      data: {
        message: "Password reset email has been triggered",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid admin password reset payload",
        400,
        error.flatten()
      );
    }

    return apiError(
      "ADMIN_PASSWORD_RESET_FAILED",
      error instanceof Error ? error.message : "Failed to trigger admin password reset",
      400
    );
  }
}
