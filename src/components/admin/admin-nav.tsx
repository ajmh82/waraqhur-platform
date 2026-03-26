import Link from "next/link";

const adminLinks = [
  {
    href: "/admin",
    label: "الرئيسية",
    description: "نقطة الدخول السريعة إلى أقسام الإدارة.",
  },
  {
    href: "/admin/users",
    label: "المستخدمون",
    description: "الحسابات، الجلسات، الأدوار، والصلاحيات.",
  },
  {
    href: "/admin/posts",
    label: "المنشورات",
    description: "إدارة المحتوى والتحرير والمتابعة.",
  },
  {
    href: "/admin/sources",
    label: "المصادر",
    description: "المصادر، الصحة التشغيلية، والـ ingest.",
  },
  {
    href: "/admin/categories",
    label: "التصنيفات",
    description: "تنظيم التصنيفات وربطها بالمحتوى.",
  },
  {
    href: "/admin/comments",
    label: "التعليقات",
    description: "مراجعة التعليقات والردود والتفاعل.",
  },
  {
    href: "/admin/invites",
    label: "الدعوات",
    description: "إدارة الدعوات المرسلة والحالة الحالية.",
  },
  {
    href: "/admin/roles",
    label: "الأدوار",
    description: "الصلاحيات ومستويات الوصول.",
  },
  {
    href: "/admin/audit-logs",
    label: "سجل العمليات",
    description: "مراجعة الأحداث الإدارية الحساسة.",
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
