import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardCopy } from "@/lib/dashboard-copy";

const pageCopy = {
  ar: {
    eyebrow: "الإعدادات",
    description: "إدارة إعدادات حسابك ولغتك وتفضيلاتك.",
    cards: [
      { href: "/dashboard/profile", title: "الملف الشخصي", body: "تعديل الاسم، الصورة، والنبذة." },
      { href: "/dashboard/account", title: "الحساب", body: "عرض تفاصيل الحساب والجلسة." },
      { href: "/dashboard/security", title: "الأمان", body: "مراجعة حالة الأمان الحالية." },
    ],
    open: "فتح",
  },
  en: {
    eyebrow: "Settings",
    description: "Manage your account settings, language, and preferences.",
    cards: [
      { href: "/dashboard/profile", title: "Profile", body: "Edit display name, avatar, and bio." },
      { href: "/dashboard/account", title: "Account", body: "View account and session details." },
      { href: "/dashboard/security", title: "Security", body: "Review current security state." },
    ],
    open: "Open",
  },
} as const;

export default async function DashboardSettingsPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];

  return (
    <AppShell>
      <section className="dashboard-panel" style={{ display: "grid", gap: "18px" }}>
        <div style={{ display: "grid", gap: "6px" }}>
          <p style={{ margin: 0, color: "#7dd3fc", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {p.eyebrow}
          </p>
          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>{t.settings}</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{p.description}</p>
        </div>

        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {p.cards.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="dashboard-card"
              style={{ textDecoration: "none", color: "inherit", padding: "18px", display: "grid", gap: "8px" }}
            >
              <strong style={{ fontSize: "16px" }}>{item.title}</strong>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>{item.body}</p>
              <span style={{ color: "#7dd3fc", fontSize: "13px", fontWeight: 700 }}>{p.open}</span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
