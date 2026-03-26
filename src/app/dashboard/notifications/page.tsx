import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface NotificationsResponse {
  notifications: Array<{ id: string; title: string; body: string; status: string; sentAt: string | null; readAt: string | null; createdAt: string; payload: { event: string } | null }>;
}

async function loadData() {
  try { return { data: await dashboardApiGet<NotificationsResponse>("/api/notifications"), error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "تعذر التحميل." }; }
}

export default async function DashboardNotificationsPage() {
  const { data, error } = await loadData();
  if (error || !data) return <ErrorState title="تعذر تحميل الإشعارات" description={error ?? "تعذر التحميل."} />;

  const notifications = data.notifications ?? [];
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <section className="dashboard-panel">
      <SectionHeading eyebrow="الإشعارات" title="إشعاراتك" description="جميع الإشعارات الواردة لحسابك." />
      <div className="dashboard-grid" style={{ marginBottom: "18px" }}>
        <article className="dashboard-card"><h3>الإجمالي</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{notifications.length}</p></article>
        <article className="dashboard-card"><h3>غير مقروءة</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{unread}</p></article>
        <article className="dashboard-card"><h3>مقروءة</h3><p style={{ fontSize: "28px", margin: "10px 0 0" }}>{notifications.length - unread}</p></article>
      </div>
      {notifications.length === 0 ? (
        <EmptyState title="لا توجد إشعارات" description="ستظهر الإشعارات هنا عند حدوث أحداث مهمة." />
      ) : (
        <div className="dashboard-list">
          {notifications.map((n) => (
            <article key={n.id} className="dashboard-card">
              <h3>{n.title}</h3>
              <p style={{ color: "var(--muted)", margin: "6px 0 12px" }}>{n.body}</p>
              <dl className="dashboard-detail-list">
                <div><dt>الحالة</dt><dd>{n.readAt ? "مقروء" : "غير مقروء"}</dd></div>
                <div><dt>التاريخ</dt><dd>{formatDateTimeInMakkah(n.createdAt, "ar-BH")}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
