import Link from "next/link";

const adminLinks = [
  {
    href: "/admin",
    label: "الرئيسية",
    description: "المدخل الرئيسي لجميع أقسام الإدارة.",
  },
  {
    href: "/admin/users",
    label: "المستخدمون",
    description: "الحسابات، الجلسات، الأدوار، والصلاحيات.",
  },
  {
    href: "/admin/posts",
    label: "المنشورات",
    description: "إدارة المحتوى والتحرير والحذف والمتابعة.",
  },
  {
    href: "/admin/sources",
    label: "المصادر",
    description: "الصحة التشغيلية، الجلب، والمراجعة السريعة.",
  },
  {
    href: "/admin/categories",
    label: "التصنيفات",
    description: "تنظيم التصنيفات وربطها بالمحتوى.",
  },
  {
    href: "/admin/comments",
    label: "التعليقات",
    description: "مراجعة النقاشات والردود والتفاعل.",
  },
  {
    href: "/admin/invites",
    label: "الدعوات",
    description: "متابعة الدعوات المرسلة وحالاتها.",
  },
  {
    href: "/admin/roles",
    label: "الأدوار",
    description: "مستويات الوصول والصلاحيات الإدارية.",
  },
  {
    href: "/admin/audit-logs",
    label: "سجل العمليات",
    description: "متابعة الأحداث والعمليات الحساسة.",
  },
] as const;

export function AdminNav() {
  return (
    <nav
      aria-label="لوحة الإدارة"
      style={{
        display: "grid",
        gap: "12px",
      }}
    >
      {adminLinks.map((link) => (
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
