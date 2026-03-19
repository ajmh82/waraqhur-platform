import { apiError, apiSuccess } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-guards";
import { listAuditLogs } from "@/services/audit-log-service";

export async function GET() {
  const guard = await requirePermission("users.manage");

  if (!guard.ok) {
    return apiError(guard.code, guard.message, guard.status);
  }

  try {

    const auditLogs = await listAuditLogs();

    return apiSuccess({
      data: {
        auditLogs,
      },
    });
  } catch (error) {
    return apiError(
      "AUDIT_LOG_LIST_FAILED",
      error instanceof Error ? error.message : "Failed to load audit logs",
      400
    );
  }
}
