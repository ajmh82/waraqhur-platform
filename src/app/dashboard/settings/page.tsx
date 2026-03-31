import Link from "next/link";
import { cookies } from "next/headers";
import { dashboardCopy } from "@/lib/dashboard-copy";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { userHasAnyPermission } from "@/services/authorization-service";

const ADMIN_ACCESS_PERMISSIONS = [
  "users.manage",
  "invites.read",
  "roles.read",
  "sources.manage",
  "comments.moderate",
  "audit.read",
  "categories.manage",
  "posts.update",
] as const;

const pageCopy = {
  ar: {
    eyebrow: "الإعدادات",
    description: "اختر القسم الذي تريد تعديله من إعدادات حسابك.",
    items: [
      { href: "/dashboard/profile", title: "الملف الشخصي", body: "تعديل الملف الشخصي والصورة." },
      { href: "/dashboard/account", title: "الحساب", body: "إدارة البريد الإلكتروني واسم المستخدم." },
      { href: "/dashboard/security", title: "الأمان", body: "إدارة إعدادات الأمان." },
      { href: "/timeline", title: "الصفحة الرئيسية", body: "الرجوع إلى التايم لاين." }
    ],
    adminItem: {
      href: "/admin",
      title: "لوحة الإدارة",
      body: "الدخول المباشر إلى صفحات الأدمن للمستخدمين المخوّلين.",
    },
    open: "فتح",
  },
  en: {
    eyebrow: "Settings",
    description: "Choose the section you want to update.",
    items: [
      { href: "/dashboard/profile", title: "Profile", body: "Edit display name, avatar, and bio." },
      { href: "/dashboard/account", title: "Account", body: "Review email, username, and status." },
      { href: "/dashboard/security", title: "Security", body: "Check security settings and sessions." },
      { href: "/timeline", title: "Timeline", body: "Go back to timeline." },
    ],
    adminItem: {
      href: "/admin",
      title: "Admin Dashboard",
      body: "Direct access to admin pages for authorized users.",
    },
    open: "Open",
  },
} as const;

async function canAccessAdminDashboard(sessionValue?: string) {
  if (!sessionValue) {
    return false;
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return await userHasAnyPermission(current.user.id, [...ADMIN_ACCESS_PERMISSIONS]);
  } catch {
    return false;
  }
}

export default async function DashboardSettingsPage() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const canAccessAdmin = await canAccessAdminDashboard(sessionValue);
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];
  const items = canAccessAdmin ? [...p.items, p.adminItem] : p.items;

  return (
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
          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>{t.settings}</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{p.description}</p>
        </div>

        <nav className="dashboard-list-nav" aria-label="Settings navigation">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="dashboard-list-item">
              <span className="dashboard-list-item__title">{item.title}</span>
              <span className="dashboard-list-item__body">{item.body}</span>
              <span className="dashboard-list-item__open">{p.open}</span>
            </Link>
          ))}
        </nav>
      </section>
  );
}
