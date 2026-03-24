import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    username: string;
    status: string;
    profile: {
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
      locale: string | null;
      timezone: string | null;
    } | null;
  };
  session: {
    id: string;
    expiresAt: string;
    lastUsedAt: string | null;
  };
}

interface SecurityPageResult {
  data: CurrentUserResponse | null;
  error: string | null;
}

async function loadSecurityPageData(): Promise<SecurityPageResult> {
  try {
    const data = await dashboardApiGet<CurrentUserResponse>("/api/auth/me");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load the security page.",
    };
  }
}

export default async function DashboardSecurityPage() {
  const { data, error } = await loadSecurityPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load security page"
        description={error ?? "Unable to load the security page."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Security"
        title="Security overview"
        description="Session and account safety information arranged in a mobile-first layout that can later evolve into deeper security controls."
      />

      <div className="dashboard-grid" style={{ marginBottom: "18px" }}>
        <article className="dashboard-card">
          <h3>Account status</h3>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{data.user.status}</p>
        </article>
        <article className="dashboard-card">
          <h3>Session active</h3>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {data.session.lastUsedAt ? "Yes" : "Unknown"}
          </p>
        </article>
        <article className="dashboard-card">
          <h3>Profile attached</h3>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {data.user.profile ? "Yes" : "No"}
          </p>
        </article>
      </div>

      <article className="dashboard-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> user={data.user.username}, status={data.user.status}, sessionId={data.session.id}
        </p>
      </article>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Current session</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Session ID</dt>
              <dd>{data.session.id}</dd>
            </div>
            <div>
              <dt>Expires at</dt>
              <dd>{formatDateTimeInMakkah(data.session.expiresAt, "en-GB")}</dd>
            </div>
            <div>
              <dt>Last used</dt>
              <dd>
                {data.session.lastUsedAt
                  ? formatDateTimeInMakkah(data.session.lastUsedAt, "en-GB")
                  : "Not available"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>Account security state</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Email address</dt>
              <dd>{data.user.email}</dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>{data.user.status}</dd>
            </div>
            <div>
              <dt>Profile attached</dt>
              <dd>{data.user.profile ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Security readiness</dt>
              <dd>Session-based authentication is active</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
