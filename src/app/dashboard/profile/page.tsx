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

interface ProfilePageResult {
  data: CurrentUserResponse | null;
  error: string | null;
}

async function loadProfilePageData(): Promise<ProfilePageResult> {
  try {
    const data = await dashboardApiGet<CurrentUserResponse>("/api/auth/me");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load the profile page.",
    };
  }
}

export default async function DashboardProfilePage() {
  const { data, error } = await loadProfilePageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load profile"
        description={error ?? "Unable to load the profile page."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Profile"
        title="Profile overview"
        description="Your personal identity, account metadata, and profile information in a layout optimized for both web and future app screens."
      />

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Identity</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Display name</dt>
              <dd>{data.user.profile?.displayName ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{data.user.username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{data.user.email}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{data.user.status}</dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>Profile details</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Bio</dt>
              <dd>{data.user.profile?.bio ?? "No bio yet"}</dd>
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
              <dt>Avatar URL</dt>
              <dd>{data.user.profile?.avatarUrl ?? "Not set"}</dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>Session</h3>
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
              <dt>Last used</dt>
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
