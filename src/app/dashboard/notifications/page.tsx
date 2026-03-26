import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface NotificationsResponse {
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    sentAt: string | null;
    readAt: string | null;
    createdAt: string;
    payload: { event: string } | null;
  }>;
}

async function loadData() {
  try {
    return {
      data: await dashboardApiGet<NotificationsResponse>("/api/notifications"),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر التحميل.",
    };
  }
}

export default async function DashboardNotificationsPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل الإشعارات"
        description={error ?? "تعذر التحميل."}
      />
    );
  }

  const notifications = data.notifications ?? [];
  const unread = notifications.filter((notification) => !notification.readAt).length;
  const read = notifications.length - unread;

  return (
    <section className="dashboard-panel">
      <SectionHeading
        eyebrow="الإشعارات"
        title="إشعاراتك"
        description="جميع التنبيهات الواردة إلى حسابك مع ملخص سريع لحالتها الحالية."
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
          <strong>الإجمالي</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>
            {notifications.length}
          </p>
        </article>
        <article className="state-card">
          <strong>غير مقروءة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{unread}</p>
        </article>
        <article className="state-card">
          <strong>مقروءة</strong>
          <p style={{ fontSize: "28px", margin: "10px 0 0" }}>{read}</p>
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
          ستظهر هنا جميع الإشعارات المرتبطة بحسابك مثل التنبيهات والتحديثات
          المهمة، مع توضيح ما إذا كانت مقروءة أو لا.
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="لا توجد إشعارات"
          description="ستظهر الإشعارات هنا عند حدوث أحداث مهمة."
        />
      ) : (
        <div className="dashboard-list">
          {notifications.map((notification) => (
            <article key={notification.id} className="dashboard-card">
              <h3>{notification.title}</h3>

              <p style={{ color: "var(--muted)", margin: "6px 0 12px" }}>
                {notification.body}
              </p>

              <dl className="dashboard-detail-list">
                <div>
                  <dt>الحالة</dt>
                  <dd>{notification.readAt ? "مقروء" : "غير مقروء"}</dd>
                </div>
                <div>
                  <dt>نوع الحدث</dt>
                  <dd>{notification.payload?.event ?? "عام"}</dd>
                </div>
                <div>
                  <dt>التاريخ</dt>
                  <dd>
                    {formatDateTimeInMakkah(notification.createdAt, "ar-BH")}
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
