import Link from "next/link";

const adminLinks = [
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/posts", label: "المنشورات" },
  { href: "/admin/sources", label: "المصادر" },
  { href: "/admin/categories", label: "التصنيفات" },
  { href: "/admin/comments", label: "التعليقات" },
  { href: "/admin/invites", label: "الدعوات" },
  { href: "/admin/roles", label: "الأدوار" },
  { href: "/admin/audit-logs", label: "سجل العمليات" },
] as const;

export function AdminNav() {
  return (
    <nav className="dashboard-nav" aria-label="لوحة الإدارة">
      {adminLinks.map((link) => (
        <Link key={link.href} href={link.href} className="dashboard-nav__link">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
