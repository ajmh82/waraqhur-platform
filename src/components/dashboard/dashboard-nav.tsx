import Link from "next/link";

const dashboardLinks = [
  { href: "/dashboard/profile", label: "الملف الشخصي" },
  { href: "/dashboard/account", label: "إعدادات الحساب" },
  { href: "/dashboard/security", label: "الأمان" },
  { href: "/dashboard/invites", label: "الدعوات" },
  { href: "/dashboard/notifications", label: "الإشعارات" },
  { href: "/dashboard/activity", label: "النشاط" },
] as const;

export function DashboardNav() {
  return (
    <nav className="dashboard-nav" aria-label="لوحة تحكم المستخدم">
      {dashboardLinks.map((link) => (
        <Link key={link.href} href={link.href} className="dashboard-nav__link">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
