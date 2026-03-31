import { dashboardApiGet } from "@/lib/dashboard-api";

type ActivityItem = {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  country: string | null;
  deviceType: string | null;
  browserName: string | null;
  platformName: string | null;
  userAgent: string | null;
};

type ActivityData = { activity: ActivityItem[] };

export default async function DashboardActivityPage() {
  const isAr = true;
  let items: ActivityItem[] = [];

  try {
    const data = await dashboardApiGet<ActivityData>("/api/dashboard/activity");
    items = Array.isArray(data.activity) ? data.activity : [];
  } catch {
    items = [];
  }

  return (
    <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>{isAr ? "النشاط" : "Activity"}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {isAr
            ? "آخر تسجيلات الدخول مع الجهاز والمتصفح والدولة (إن توفرت)."
            : "Recent sign-ins with device, browser, and country (when available)."}
        </p>

        <div className="dashboard-list-nav">
          {items.length === 0 ? (
            <div className="dashboard-list-item">
              <span className="dashboard-list-item__body">
                {isAr ? "لا توجد بيانات نشاط متاحة حالياً." : "No activity data available yet."}
              </span>
            </div>
          ) : (
            items.map((x, idx) => (
              <div key={x.id} className="dashboard-list-item">
                <span className="dashboard-list-item__title">
                  {idx === 0
                    ? isAr
                      ? "آخر دخول"
                      : "Last sign-in"
                    : isAr
                    ? "دخول سابق"
                    : "Previous sign-in"}{" "}
                  • {new Date(x.lastUsedAt ?? x.createdAt).toLocaleString()}
                </span>
                <span className="dashboard-list-item__body">
                  {(x.country ?? (isAr ? "غير متاح" : "Unavailable")) +
                    " • " +
                    (x.deviceType ?? (isAr ? "جهاز غير معروف" : "Unknown device")) +
                    " • " +
                    ((x.browserName || x.platformName)
                      ? `${x.browserName ?? ""}${x.platformName ? ` (${x.platformName})` : ""}`.trim()
                      : (isAr ? "متصفح غير معروف" : "Unknown browser"))}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
  );
}
