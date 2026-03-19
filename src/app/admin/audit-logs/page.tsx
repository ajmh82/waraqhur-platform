import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AuditLogsResponse {
  auditLogs: Array<{
    id: string;
    actorUserId: string | null;
    actorType: string;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    actorUser: {
      id: string;
      email: string;
      username: string;
    } | null;
  }>;
}

interface AuditLogsPageResult {
  data: AuditLogsResponse | null;
  error: string | null;
}

async function loadAuditLogsPageData(): Promise<AuditLogsPageResult> {
  try {
    const data = await dashboardApiGet<AuditLogsResponse>("/api/admin/audit-logs");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load audit logs.",
    };
  }
}

export default async function AdminAuditLogsPage() {
  const { data, error } = await loadAuditLogsPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load audit logs"
        description={error ?? "Unable to load audit logs."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Audit log"
        description="A protected timeline of sensitive administrative actions, designed for traceability and future expansion."
      />

      {data.auditLogs.length === 0 ? (
        <EmptyState
          title="No audit logs yet"
          description="Sensitive administrative actions will appear here once they are performed."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Target type</th>
                <th>Target ID</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {data.auditLogs.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    {entry.actorUser
                      ? entry.actorUser.username
                      : entry.actorType}
                  </td>
                  <td>{entry.action}</td>
                  <td>{entry.targetType}</td>
                  <td>{entry.targetId ?? "N/A"}</td>
                  <td>{new Date(entry.createdAt).toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
