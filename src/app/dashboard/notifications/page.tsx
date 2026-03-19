import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";

interface NotificationsResponse {
  notifications: Array<{
    id: string;
    userId: string;
    channel: string;
    status: string;
    title: string;
    body: string;
    payload: {
      event: string;
      actionUrl?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null;
    sentAt: string | null;
    readAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface NotificationsPageResult {
  data: NotificationsResponse | null;
  error: string | null;
}

async function loadNotificationsPageData(): Promise<NotificationsPageResult> {
  try {
    const data =
      await dashboardApiGet<NotificationsResponse>("/api/notifications");
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Unable to load notifications.",
    };
  }
}

export default async function DashboardNotificationsPage() {
  const { data, error } = await loadNotificationsPageData();

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to load notifications"
        description={error ?? "Unable to load notifications."}
      />
    );
  }

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="Notifications"
        title="In-app notifications"
        description="A consolidated timeline of in-app notification events prepared for both web and future app notification screens."
      />

      {data.notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Notifications will appear here when important events happen."
        />
      ) : (
        <div className="dashboard-list">
          {data.notifications.map((notification) => (
            <article key={notification.id} className="dashboard-card">
              <h3>{notification.title}</h3>
              <p className="dashboard-card__body">{notification.body}</p>

              <dl className="dashboard-detail-list">
                <div>
                  <dt>Event</dt>
                  <dd>{notification.payload?.event ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{notification.status}</dd>
                </div>
                <div>
                  <dt>Sent at</dt>
                  <dd>
                    {notification.sentAt
                      ? new Date(notification.sentAt).toLocaleString("en-GB")
                      : "Not sent"}
                  </dd>
                </div>
                <div>
                  <dt>Read at</dt>
                  <dd>
                    {notification.readAt
                      ? new Date(notification.readAt).toLocaleString("en-GB")
                      : "Unread"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
