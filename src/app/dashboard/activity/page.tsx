import { cookies } from "next/headers";
import { dashboardApiGet } from "@/lib/dashboard-api";

type ActivityItem = {
  id: string;
  at: string;
  country: string | null;
  client: string | null;
  source: "current" | "audit";
};

type ActivityData = { items: ActivityItem[] };

export default async function DashboardActivityPage() {
  const cookieStore = await cookies();
  const isAr = cookieStore.get("locale")?.value !== "en";
  let items: ActivityItem[] = [];

  try {
    const data = await dashboardApiGet<ActivityData>("/api/dashboard/activity");
    items = Array.isArray(data.items) ? data.items : [];
  } catch {
    items = [];
  }

  return (
    <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>{isAr ? "النشاط" : "Activity"}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {isAr
            ? "آخر تسجيلات الدخول خلال 7 أيام (الدولة والعميل حسب البيانات المتاحة)."
            : "Last sign-ins for 7 days (country/client when available)."}
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
                  • {new Date(x.at).toLocaleString()}
                </span>
                <span className="dashboard-list-item__body">
                  {(x.country ?? (isAr ? "غير متاح" : "Unavailable")) +
                    " • " +
                    (x.client ?? (isAr ? "غير متاح" : "Unavailable"))}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
  );
}
