import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
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

interface NotificationsResponse {
  notifications: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    readAt: string | null;
  }>;
}

interface InvitationsResponse {
  invitations: Array<{
    id: string;
    email: string;
    status: string;
    createdAt: string;
    acceptedAt: string | null;
  }>;
}

interface ActivityPageResult {
  currentUser: CurrentUserResponse | null;
  notificationsData: NotificationsResponse | null;
  invitationsData: InvitationsResponse | null;
  error: string | null;
}

async function loadActivityPageData(): Promise<ActivityPageResult> {
  try {
    const [currentUser, notificationsData, invitationsData] = await Promise.all([
      dashboardApiGet<CurrentUserResponse>("/api/auth/me"),
      dashboardApiGet<NotificationsResponse>("/api/notifications"),
      dashboardApiGet<InvitationsResponse>("/api/invitations"),
    ]);

    return {
      currentUser,
      notificationsData,
      invitationsData,
      error: null,
    };
  } catch (error) {
    return {
      currentUser: null,
      notificationsData: null,
      invitationsData: null,
      error:
        error instanceof Error ? error.message : "Unable to load the activity page.",
    };
  }
}

export default async function DashboardActivityPage() {
  const { currentUser, notificationsData, invitationsData, error } =
    await loadActivityPageData();

  if (error || !currentUser || !notificationsData || !invitationsData) {
    return (
      <ErrorState
        title="Failed to load activity"
        description={error ?? "Unable to load the activity page."}
      />
    );
  }

  const notifications = Array.isArray(notificationsData.notifications)
    ? notificationsData.notifications
    : [];
  const invitations = Array.isArray(invitationsData.invitations)
    ? invitationsData.invitations
    : [];

  const unreadNotifications = notifications.filter(
    (notification) => !notification.readAt
  ).length;

  const acceptedInvitations = invitations.filter(
    (invitation) => invitation.acceptedAt
  ).length;

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Activity"
        title="Activity overview"
        description="A compact summary of recent account activity, session state, invitations, and notifications in a layout suitable for both mobile web and future app screens."
      />

      <div className="dashboard-grid" style={{ marginBottom: "18px" }}>
        <article className="dashboard-card">
          <h3>Unread notifications</h3>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{unreadNotifications}</p>
        </article>
        <article className="dashboard-card">
          <h3>Accepted invitations</h3>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{acceptedInvitations}</p>
        </article>
        <article className="dashboard-card">
          <h3>Session status</h3>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{currentUser.user.status}</p>
        </article>
      </div>

      <article className="dashboard-card" style={{ marginBottom: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>Current view:</strong> user={currentUser.user.username}, notifications={notifications.length}, unread={unreadNotifications}, invitations={invitations.length}
        </p>
      </article>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Session activity</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Session ID</dt>
              <dd>{currentUser.session.id}</dd>
            </div>
            <div>
              <dt>Last used</dt>
              <dd>
                {currentUser.session.lastUsedAt
                  ? formatDateTimeInMakkah(currentUser.session.lastUsedAt, "en-GB")
                  : "Not available"}
              </dd>
            </div>
            <div>
              <dt>Expires at</dt>
              <dd>
                {formatDateTimeInMakkah(currentUser.session.expiresAt, "en-GB")}
              </dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>Notification activity</h3>
          {notifications.length === 0 ? (
            <EmptyState
              title="No notifications"
              description="No notification activity is available yet."
            />
          ) : (
            <dl className="dashboard-detail-list">
              <div>
                <dt>Total notifications</dt>
                <dd>{notifications.length}</dd>
              </div>
              <div>
                <dt>Unread notifications</dt>
                <dd>{unreadNotifications}</dd>
              </div>
              <div>
                <dt>Latest notification</dt>
                <dd>{formatDateTimeInMakkah(notifications[0].createdAt, "en-GB")}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="dashboard-card">
          <h3>Invitation activity</h3>
          {invitations.length === 0 ? (
            <EmptyState
              title="No invitations"
              description="No invitation activity is available yet."
            />
          ) : (
            <dl className="dashboard-detail-list">
              <div>
                <dt>Total invitations</dt>
                <dd>{invitations.length}</dd>
              </div>
              <div>
                <dt>Accepted invitations</dt>
                <dd>{acceptedInvitations}</dd>
              </div>
              <div>
                <dt>Latest invitation</dt>
                <dd>{formatDateTimeInMakkah(invitations[0].createdAt, "en-GB")}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="dashboard-card">
          <h3>Account activity</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Username</dt>
              <dd>{currentUser.user.username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{currentUser.user.email}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{currentUser.user.status}</dd>
            </div>
            <div>
              <dt>Profile attached</dt>
              <dd>{currentUser.user.profile ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
