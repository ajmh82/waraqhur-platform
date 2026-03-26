import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface CurrentUserResponse { user: { id: string; username: string; email: string; status: string; profile: { displayName: string } | null }; session: { id: string; expiresAt: string; lastUsedAt: string | null } }
interface NotificationsResponse { notifications: Array<{ id: string; title: string; createdAt: string; readAt: string | null }> }
interface InvitationsResponse { invitations: Array<{ id: string; email: string; status: string; createdAt: string; acceptedAt: string | null }> }

async function loadData() {
  try {
    const [currentUser, notifs, invites] = await Promise.all([
      dashboardApiGet<CurrentUserResponse>("/api/auth/me"),
      dashboardApiGet<NotificationsResponse>("/api/notifications"),
      dashboardApiGet<InvitationsResponse>("/api/invitations"),
    ]);
    return { currentUser, notifs, invites, error: null };
  } catch (error) { return { currentUser: null, notifs: null, invites: null, error: error instanceof Error ? error.message : "تعذر التحميل." }; }
}

export default async function DashboardActivityPage() {
  const { currentUser, notifs, invites, error } = await loadData();
  if (error || !currentUser || !notifs || !invites) return <ErrorState title="تعذر تحميل النشاط" description={error ?? "تعذر التحميل."} />;

  const notifications = notifs.notifications ?? [];
  const invitations = invites.invitations ?? [];
  const unread = notifications.filter((n) => !n.readAt).length;
  const accepted = invitations.filter((i) => i.acceptedAt).length;

  return (
    <section className="dashboard-panel">
      <SectionHeading eyebrow="النشاط" title="ملخص النشاط" description="نظرة شاملة على نشاط حسابك." />
      <div className="dashboard-grid" style={{ marginBottom: "18px" }}>
        <article className="dashboard-card"><h3>إشعارات غير مقروءة</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{unread}</p></article>
        <article className="dashboard-card"><h3>دعوات مقبولة</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{accepted}</p></article>
        <article className="dashboard-card"><h3>حالة الحساب</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{currentUser.user.status}</p></article>
      </div>
      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>نشاط الجلسة</h3>
          <dl className="dashboard-detail-list">
            <div><dt>آخر استخدام</dt><dd>{currentUser.session.lastUsedAt ? formatDateTimeInMakkah(currentUser.session.lastUsedAt, "ar-BH") : "غير متوفر"}</dd></div>
            <div><dt>تنتهي في</dt><dd>{formatDateTimeInMakkah(currentUser.session.expiresAt, "ar-BH")}</dd></div>
          </dl>
        </article>
        <article className="dashboard-card">
          <h3>الإشعارات</h3>
          {notifications.length === 0 ? <EmptyState title="لا توجد إشعارات" description="لا يوجد نشاط إشعارات بعد." /> : (
            <dl className="dashboard-detail-list">
              <div><dt>الإجمالي</dt><dd>{notifications.length}</dd></div>
              <div><dt>غير مقروءة</dt><dd>{unread}</dd></div>
            </dl>
          )}
        </article>
        <article className="dashboard-card">
          <h3>الدعوات</h3>
          {invitations.length === 0 ? <EmptyState title="لا توجد دعوات" description="لا يوجد نشاط دعوات بعد." /> : (
            <dl className="dashboard-detail-list">
              <div><dt>الإجمالي</dt><dd>{invitations.length}</dd></div>
              <div><dt>مقبولة</dt><dd>{accepted}</dd></div>
            </dl>
          )}
        </article>
      </div>
    </section>
  );
}
