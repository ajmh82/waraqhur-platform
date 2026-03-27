import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardCopy } from "@/lib/dashboard-copy";

const pageCopy = {
  ar: {
    overview: "نظرة عامة",
    description:
      "هذه هي نقطة الدخول المركزية إلى حسابك، علاقاتك، رسائلك، وإعداداتك داخل المنصة.",
    quickLinks: [
      {
        href: "/dashboard/profile",
        title: "الملف الشخصي",
        body: "إدارة الاسم والصورة والنبذة.",
      },
      {
        href: "/dashboard/account",
        title: "الحساب",
        body: "راجع بيانات الحساب الأساسية.",
      },
      {
        href: "/dashboard/security",
        title: "الأمان",
        body: "حدّث إعدادات الأمان والجلسات.",
      },
      {
        href: "/dashboard/notifications",
        title: "الإشعارات",
        body: "راجع تنبيهاتك الأخيرة.",
      },
      {
        href: "/dashboard/activity",
        title: "النشاط",
        body: "تابع أحدث نشاطاتك داخل المنصة.",
      },
      {
        href: "/dashboard/settings",
        title: "الإعدادات",
        body: "غيّر اللغة والمنطقة الزمنية وتفضيلاتك.",
      },
      {
        href: "/dashboard/invites",
        title: "الدعوات",
        body: "راجع الدعوات المرتبطة بحسابك.",
      },
    ],
  },
  en: {
    overview: "Overview",
    description:
      "This is the central entry point to your account, connections, messages, and settings inside the platform.",
    quickLinks: [
      {
        href: "/dashboard/profile",
        title: "Profile",
        body: "Manage your name, avatar, and bio.",
      },
      {
        href: "/dashboard/account",
        title: "Account",
        body: "Review your core account details.",
      },
      {
        href: "/dashboard/security",
        title: "Security",
        body: "Update security settings and sessions.",
      },
      {
        href: "/dashboard/notifications",
        title: "Notifications",
        body: "Review your latest alerts.",
      },
      {
        href: "/dashboard/activity",
        title: "Activity",
        body: "Track your latest actions on the platform.",
      },
      {
        href: "/dashboard/settings",
        title: "Settings",
        body: "Change language, time zone, and preferences.",
      },
      {
        href: "/dashboard/invites",
        title: "Invites",
        body: "Review invites associated with your account.",
      },
    ],
  },
} as const;

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];

  return (
    <AppShell>
      <section
        className="dashboard-panel"
        style={{
          display: "grid",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "6px",
          }}
        >
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
            {p.overview}
          </p>

          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>
            {t.dashboard}
          </h1>

          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
            {p.description}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {p.quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="dashboard-card"
              style={{
                textDecoration: "none",
                color: "inherit",
                padding: "18px",
                display: "grid",
                gap: "8px",
              }}
            >
              <strong style={{ fontSize: "16px" }}>{item.title}</strong>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
                {item.body}
              </p>
              <span
                style={{
                  color: "#7dd3fc",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {t.open}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
