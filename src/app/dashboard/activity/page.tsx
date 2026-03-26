import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface CurrentUserResponse {
  user: {
    id: string;
    username: string;
    email: string;
    status: string;
    profile: { displayName: string } | null;
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

async function loadData() {
  try {
    const [currentUser, notifications, invitations] = await Promise.all([
      dashboardApiGet<CurrentUserResponse>("/api/auth/me"),
      dashboardApiGet<NotificationsResponse>("/api/notifications"),
      dashboardApiGet<InvitationsResponse>("/api/invitations"),
    ]);

    return {
      currentUser,
      notifications,
      invitations,
      error: null,
    };
  } catch (error) {
    return {
      currentUser: null,
      notifications: null,
      invitations: null,
      error: error instanceof Error ? error.message : "تعذر التحميل.",
    };
  }
}

export default async function DashboardActivityPage() {
  const { currentUser, notifications, invitations, error } = await loadData();

  if (error || !currentUser || !notifications || !invitations) {
    return (
      <ErrorState
        title="تعذر تحميل النشاط"
        description={error ?? "تعذر التحميل."}
      />
    );
  }

  const allNotifications = notifications.notifications ?? [];
  const allInvitations = invitations.invitations ?? [];
  const unreadNotifications = allNotifications.filter(
    (notification) => !notification.readAt
  ).length;
  const acceptedInvitations = allInvitations.filter(
    (invitation) => invitation.acceptedAt
  ).length;

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="النشاط"
        title="ملخص النشاط"
        description="نظرة شاملة على نشاط حسابك والجلسة والإشعارات والدعوات."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <article className="state-card">
          <strong>إشعارات غير مقروءة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {unreadNotifications}
          </p>
        </article>
        <article className="state-card">
          <strong>دعوات مقبولة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {acceptedInvitations}
          </p>
        </article>
        <article className="state-card">
          <strong>حالة الحساب</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {currentUser.user.status}
          </p>
        </article>
      </div>

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          padding: "16px",
          display: "grid",
          gap: "8px",
        }}
      >
        <strong>ملخص سريع</strong>
        <p style={{ margin: 0 }}>
          هذه الصفحة تعطيك نظرة مركزة على الحساب من زاوية النشاط: آخر استخدام،
          وضع الإشعارات، ووضع الدعوات المرتبطة بحسابك.
        </p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>نشاط الجلسة</h3>
          <dl className="dashboard-detail-list">
            <div>
              <dt>آخر استخدام</dt>
              <dd>
                {currentUser.session.lastUsedAt
                  ? formatDateTimeInMakkah(
                      currentUser.session.lastUsedAt,
                      "ar-BH"
                    )
                  : "غير متوفر"}
              </dd>
            </div>
            <div>
              <dt>تنتهي في</dt>
              <dd>
                {formatDateTimeInMakkah(currentUser.session.expiresAt, "ar-BH")}
              </dd>
            </div>
          </dl>
        </article>

        <article className="dashboard-card">
          <h3>الإشعارات</h3>
          {allNotifications.length === 0 ? (
            <EmptyState
              title="لا توجد إشعارات"
              description="لا يوجد نشاط إشعارات بعد."
            />
          ) : (
            <dl className="dashboard-detail-list">
              <div>
                <dt>الإجمالي</dt>
                <dd>{allNotifications.length}</dd>
              </div>
              <div>
                <dt>غير مقروءة</dt>
                <dd>{unreadNotifications}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="dashboard-card">
          <h3>الدعوات</h3>
          {allInvitations.length === 0 ? (
            <EmptyState
              title="لا توجد دعوات"
              description="لا يوجد نشاط دعوات بعد."
            />
          ) : (
            <dl className="dashboard-detail-list">
              <div>
                <dt>الإجمالي</dt>
                <dd>{allInvitations.length}</dd>
              </div>
              <div>
                <dt>مقبولة</dt>
                <dd>{acceptedInvitations}</dd>
              </div>
            </dl>
          )}
        </article>
      </div>
    </section>
  );
}
