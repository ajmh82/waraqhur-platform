import Link from "next/link";

const dashboardLinks = [
  {
    href: "/dashboard/profile",
    label: "الملف الشخصي",
    description: "مراجعة هويتك ومعلوماتك العامة.",
  },
  {
    href: "/dashboard/account",
    label: "إعدادات الحساب",
    description: "بيانات الحساب الأساسية والجلسة الحالية.",
  },
  {
    href: "/dashboard/security",
    label: "الأمان",
    description: "متابعة وضع الأمان والجلسة النشطة.",
  },
  {
    href: "/dashboard/invites",
    label: "الدعوات",
    description: "مراجعة الدعوات وحالتها الحالية.",
  },
  {
    href: "/dashboard/notifications",
    label: "الإشعارات",
    description: "جميع التنبيهات والتحديثات المرتبطة بحسابك.",
  },
  {
    href: "/dashboard/activity",
    label: "النشاط",
    description: "ملخص نشاطك داخل المنصة.",
  },
] as const;

export function DashboardNav() {
  return (
    <nav
      aria-label="لوحة تحكم المستخدم"
      style={{
        display: "grid",
        gap: "12px",
      }}
    >
      {dashboardLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="state-card"
          style={{
            maxWidth: "100%",
            margin: 0,
            padding: "16px 18px",
            textDecoration: "none",
            color: "inherit",
            display: "grid",
            gap: "6px",
          }}
        >
          <strong>{link.label}</strong>
          <span
            style={{
              color: "var(--muted)",
              fontSize: "14px",
              lineHeight: 1.7,
            }}
          >
            {link.description}
          </span>
        </Link>
      ))}
    </nav>
  );
}
