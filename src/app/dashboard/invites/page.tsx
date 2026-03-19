import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface InvitationsResponse {
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

interface InvitesPageResult {
  data: InvitationsResponse | null;
  error: string | null;
}

async function loadInvitesPageData(): Promise<InvitesPageResult> {
  try {
    const data = await dashboardApiGet<InvitationsResponse>("/api/invitations");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load invitations.",
    };
  }
}

export default async function DashboardInvitesPage() {
  const { data, error } = await loadInvitesPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load invites"
        description={error ?? "Unable to load invitations."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Invites"
        title="Invitation history"
        description="Track invitations you created, their current status, and whether they were accepted."
      />

      {data.invitations.length === 0 ? (
        <EmptyState
          title="No invitations yet"
          description="Once invitations are created, they will appear here."
        />
      ) : (
        <div className="dashboard-list">
          {data.invitations.map((invitation) => (
            <article key={invitation.id} className="dashboard-card">
              <h3>{invitation.email}</h3>
              <dl className="dashboard-detail-list">
                <div>
                  <dt>Status</dt>
                  <dd>{invitation.status}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{invitation.role?.name ?? "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Sent at</dt>
                  <dd>
                    {invitation.sentAt
                      ? new Date(invitation.sentAt).toLocaleString("en-GB")
                      : "Not sent"}
                  </dd>
                </div>
                <div>
                  <dt>Expires at</dt>
                  <dd>{new Date(invitation.expiresAt).toLocaleString("en-GB")}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
