import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface AdminInvitationsResponse {
  invitations: Array<{
    id: string;
    email: string;
    token: string;
    status: string;
    sentAt: string | null;
    acceptedAt: string | null;
    revokedAt: string | null;
    expiresAt: string;
    createdAt: string;
    role: {
      key: string;
      name: string;
    } | null;
    issuerUser: {
      id: string;
      email: string;
      username: string;
    };
    usages: Array<{
      id: string;
      usedAt: string;
      user: {
        id: string;
        email: string;
        username: string;
      };
    }>;
  }>;
}

interface AdminInvitesPageResult {
  data: AdminInvitationsResponse | null;
  error: string | null;
}

async function loadAdminInvitesPageData(): Promise<AdminInvitesPageResult> {
  try {
    const data =
      await dashboardApiGet<AdminInvitationsResponse>("/api/invitations");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load admin invitations list.",
    };
  }
}

export default async function AdminInvitesPage() {
  const { data, error } = await loadAdminInvitesPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load invites"
        description={error ?? "Unable to load admin invitations list."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Admin"
        title="Invitations management"
        description="A protected invitations view for administration, ready for later expansion with revoke, resend, and filtering workflows."
      />

      {data.invitations.length === 0 ? (
        <EmptyState
          title="No invitations found"
          description="No invitations are available for administration yet."
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>Issued by</th>
                <th>Sent at</th>
                <th>Expires at</th>
              </tr>
            </thead>

            <tbody>
              {data.invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>{invitation.status}</td>
                  <td>{invitation.role?.name ?? "No role"}</td>
                  <td>{invitation.issuerUser.username}</td>
                  <td>
                    {invitation.sentAt
                      ? new Date(invitation.sentAt).toLocaleString("en-GB")
                      : "Not sent"}
                  </td>
                  <td>{new Date(invitation.expiresAt).toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
