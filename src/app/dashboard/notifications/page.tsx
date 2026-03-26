import Link from "next/link";
import { SectionHeading } from "@/components/content/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { dashboardApiGet } from "@/lib/dashboard-api";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface NotificationsResponse {
  user: {
    id: string;
    username: string;
  };
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    createdAt: string;
    readAt: string | null;
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
      error:
        error instanceof Error ? error.message : "تعذر تحميل الإشعارات.",
    };
  }
}

export default async function DashboardNotificationsPage() {
  const { data, error } = await loadData();

  if (error || !data) {
    return (
      <ErrorState
        title="تعذر تحميل الإشعارات"
        description={error ?? "تعذر تحميل الإشعارات."}
      />
    );
  }

  const unreadCount = data.notifications.filter(
    (notification) => !notification.readAt
  ).length;

  return (
    <section className="dashboard-panel">
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <Link href="/dashboard/activity" className="btn small">
          النشاط
        </Link>
        <Link href="/messages" className="btn small">
          الرسائل
        </Link>
        <Link href="/search" className="btn small">
          البحث
        </Link>
        <Link href={`/u/${data.user.username}`} className="btn small">
          الملف العام
        </Link>
      </div>

      <SectionHeading
        eyebrow="Notifications"
        title="الإشعارات"
        description="هذه الصفحة تجمع أحدث التنبيهات والإشعارات المرتبطة بحسابك."
      />

      <div
        className="state-card"
        style={{
          maxWidth: "100%",
          margin: "0 0 18px",
          display: "grid",
          gap: "8px",
        }}
      >
        <strong>ملخص الإشعارات</strong>
        <p style={{ margin: 0 }}>
          لديك {unreadCount} إشعارًا غير مقروء من أصل {data.notifications.length}{" "}
          إشعار.
        </p>
      </div>

      {data.notifications.length === 0 ? (
        <EmptyState
          title="لا توجد إشعارات بعد"
          description="ستظهر الإشعارات الجديدة هنا عندما تتوفر."
        />
      ) : (
        <div className="dashboard-list">
          {data.notifications.map((notification) => (
            <article key={notification.id} className="dashboard-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "grid", gap: "6px" }}>
                  <strong>{notification.title}</strong>
                  <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                    {notification.body}
                  </span>
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    background: notification.readAt
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(34, 199, 255, 0.16)",
                    color: notification.readAt ? "var(--muted)" : "#d5f3ff",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {notification.readAt ? "مقروء" : "جديد"}
                </span>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  gap: "14px",
                  flexWrap: "wrap",
                  color: "var(--muted)",
                  fontSize: "14px",
                }}
              >
                <span>{notification.status}</span>
                <span>
                  {formatDateTimeInMakkah(notification.createdAt, "ar-BH")}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
