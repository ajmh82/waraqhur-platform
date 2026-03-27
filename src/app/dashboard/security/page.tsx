import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardApiGet } from "@/lib/dashboard-api";

type SecurityData = {
  user: { email: string; status: string };
  session: { id: string; expiresAt: string; lastUsedAt: string | null };
};

export default async function DashboardSecurityPage() {
  const isAr = true;
  let data: SecurityData | null = null;

  try {
    data = await dashboardApiGet<SecurityData>("/api/auth/me");
  } catch {
    data = null;
  }

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>{isAr ? "الأمان" : "Security"}</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {isAr ? "إعدادات أمان مفيدة لإدارة حسابك بشكل احترافي." : "Practical security controls for your account."}
        </p>

        <div className="dashboard-list-nav">
          <div className="dashboard-list-item">
            <span className="dashboard-list-item__title">{isAr ? "حالة الحساب" : "Account status"}</span>
            <span className="dashboard-list-item__body">
              {data ? `${isAr ? "البريد:" : "Email:"} ${data.user.email}` : isAr ? "غير متاح" : "Unavailable"}
            </span>
          </div>

          <div className="dashboard-list-item">
            <span className="dashboard-list-item__title">{isAr ? "الجلسة الحالية" : "Current session"}</span>
            <span className="dashboard-list-item__body">
              {data
                ? `${isAr ? "آخر استخدام:" : "Last used:"} ${
                    data.session.lastUsedAt
                      ? new Date(data.session.lastUsedAt).toLocaleString()
                      : isAr
                      ? "غير معروف"
                      : "Unknown"
                  }`
                : isAr
                ? "غير متاح"
                : "Unavailable"}
            </span>
          </div>

          <div className="dashboard-list-item">
            <span className="dashboard-list-item__title">{isAr ? "إجراءات سريعة" : "Quick actions"}</span>
            <span className="dashboard-list-item__body">
              <Link href="/dashboard/account">{isAr ? "إدارة بيانات الحساب" : "Manage account data"}</Link>
              {" • "}
              <Link href="/dashboard/activity">{isAr ? "سجل الدخول" : "Sign-in history"}</Link>
            </span>
          </div>
        </div>

        <form action="/api/auth/logout" method="post">
          <button className="settings-form__submit" type="submit">
            {isAr ? "تسجيل الخروج من هذه الجلسة" : "Sign out of this session"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
