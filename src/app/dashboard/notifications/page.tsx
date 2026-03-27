import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";
import { dashboardCopy } from "@/lib/dashboard-copy";
import { NotificationsManager } from "@/components/dashboard/notifications-manager";

interface NotificationsPageData {
  data?: {
    notifications?: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      readAt: string | null;
      createdAt: string;
    }>;
  };
}

const pageCopy = {
  ar: {
    eyebrow: "الإشعارات",
    description: "هنا تجد أحدث التنبيهات المرتبطة بحسابك وتقدر تدير حالتها.",
    failedTitle: "تعذر تحميل الإشعارات",
    failedDescription: "تعذر تحميل قائمة الإشعارات.",
  },
  en: {
    eyebrow: "Notifications",
    description: "Here are your latest account alerts, and you can manage their read state.",
    failedTitle: "Failed to load notifications",
    failedDescription: "Failed to load notifications list.",
  },
} as const;

export default async function DashboardNotificationsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];

  let data: NotificationsPageData | null = null;
  let error: string | null = null;

  try {
    data = await apiGet<NotificationsPageData>("/api/notifications");
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : p.failedDescription;
  }

  if (!data || error) {
    return (
      <AppShell>
        <section className="dashboard-panel">
          <ErrorState title={p.failedTitle} description={error ?? p.failedDescription} />
        </section>
      </AppShell>
    );
  }

  const notifications = data.data?.notifications ?? [];

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: "18px" }}>
        <div style={{ display: "grid", gap: "6px" }}>
          <p
            style={{
              margin: 0,
              color: "#7dd3fc",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {p.eyebrow}
          </p>
          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>{t.notifications}</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{p.description}</p>
        </div>

        <NotificationsManager locale={locale} initialItems={notifications} />
      </section>
    </AppShell>
  );
}
