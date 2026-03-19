import { SectionHeading } from "@/components/content/section-heading";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

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

interface AccountPageResult {
  data: CurrentUserResponse | null;
  error: string | null;
}

async function loadAccountPageData(): Promise<AccountPageResult> {
  try {
    const data = await dashboardApiGet<CurrentUserResponse>("/api/auth/me");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load the account settings page.",
    };
  }
}

export default async function DashboardAccountPage() {
  const { data, error } = await loadAccountPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load account settings"
        description={error ?? "Unable to load the account settings page."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Account"
        title="Account settings"
        description="Core account information and session metadata prepared in a structure that can later map directly to mobile account screens."
      />

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Account identity</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Email address</dt>
              <dd>{data.user.email}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{data.user.username}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>{data.user.id}</dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>{data.user.status}</dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>Profile mapping</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Display name</dt>
              <dd>{data.user.profile?.displayName ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Locale</dt>
              <dd>{data.user.profile?.locale ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{data.user.profile?.timezone ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Bio status</dt>
              <dd>{data.user.profile?.bio ? "Available" : "Empty"}</dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>Active session</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Session ID</dt>
              <dd>{data.session.id}</dd>
            </div>
            <div>
              <dt>Expires at</dt>
              <dd>{new Date(data.session.expiresAt).toLocaleString("en-GB")}</dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>
                {data.session.lastUsedAt
                  ? new Date(data.session.lastUsedAt).toLocaleString("en-GB")
                  : "Not available"}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
