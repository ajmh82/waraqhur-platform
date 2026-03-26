import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { SectionHeading } from "@/components/content/section-heading";

const adminCards = [
  {
    href: "/admin/users",
    title: "المستخدمون",
    description: "إدارة الحسابات، الأدوار، الصلاحيات، والجلسات.",
  },
  {
    href: "/admin/sources",
    title: "المصادر",
    description: "مراجعة المصادر، الصحة التشغيلية، والـ ingest.",
  },
  {
    href: "/admin/posts",
    title: "المنشورات",
    description: "متابعة المحتوى، التحرير، والحذف والأرشفة.",
  },
  {
    href: "/admin/comments",
    title: "التعليقات",
    description: "إدارة التعليقات والردود ومراجعة التفاعل.",
  },
  {
    href: "/admin/categories",
    title: "التصنيفات",
    description: "تنظيم التصنيفات وربطها بالمحتوى والمصادر.",
  },
  {
    href: "/admin/roles",
    title: "الأدوار",
    description: "إدارة الصلاحيات ومستويات الوصول داخل النظام.",
  },
  {
    href: "/admin/invites",
    title: "الدعوات",
    description: "مراجعة الدعوات المرسلة وقبولها وإلغائها.",
  },
  {
    href: "/admin/audit-logs",
    title: "سجل النشاط",
    description: "متابعة العمليات الحساسة وسجل الأحداث الإدارية.",
  },
];

export default function AdminIndexPage() {
  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="page-section">
          <SectionHeading
            eyebrow="لوحة الإدارة"
            title="مركز الإدارة الرئيسي"
            description="هذه الصفحة أصبحت نقطة الدخول الإدارية الواضحة بدل التحويل التلقائي. اختر المجال الذي تريد العمل عليه مباشرة."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "18px",
            }}
          >
            {adminCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="state-card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <strong style={{ fontSize: "18px" }}>{card.title}</strong>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
