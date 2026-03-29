import Link from "next/link";
import { cookies } from "next/headers";
import { dashboardCopy } from "@/lib/dashboard-copy";

const pageCopy = {
  ar: {
    title: "لوحة المستخدم",
    subtitle: "اختر القسم الذي تريد إدارته.",
    sections: [
      {
        href: "/dashboard/profile",
        title: "الملف الشخصي",
        body: "تعديل الاسم المستعار، الصورة الشخصية، والنبذة.",
      },
      {
        href: "/dashboard/account",
        title: "الحساب",
        body: "إدارة البريد الإلكتروني واسم المستخدم.",
      },
      {
        href: "/dashboard/security",
        title: "الأمان",
        body: "إعدادات الأمان وسجل الدخول.",
      },
      {
        href: "/dashboard/activity",
        title: "النشاط",
        body: "عرض آخر عمليات تسجيل الدخول خلال الأسبوع.",
      },
      {
        href: "/dashboard/invites",
        title: "الدعوات",
        body: "إدارة الدعوات وإرسال دعوات جديدة.",
      },
    ],
    open: "فتح",
    home: "الصفحة الرئيسية",
  },
  en: {
    title: "User Dashboard",
    subtitle: "Choose the section you want to manage.",
    sections: [
      {
        href: "/dashboard/profile",
        title: "Profile",
        body: "Update nickname, avatar, and bio.",
      },
      {
        href: "/dashboard/account",
        title: "Account",
        body: "Manage email and username.",
      },
      {
        href: "/dashboard/security",
        title: "Security",
        body: "Security settings and sign-in history.",
      },
      {
        href: "/dashboard/activity",
        title: "Activity",
        body: "See recent sign-ins from the last 7 days.",
      },
      {
        href: "/dashboard/invites",
        title: "Invites",
        body: "Manage and send invitations.",
      },
    ],
    open: "Open",
    home: "Home",
  },
} as const;

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const t = dashboardCopy[locale];
  const p = pageCopy[locale];

  return (
    <section className="dashboard-panel" style={{ display: "grid", gap: "18px" }}>
        <div style={{ display: "grid", gap: "8px" }}>
          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>{p.title}</h1>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{p.subtitle}</p>
        </div>

        <div>
          <Link href="/timeline" className="dashboard-list-item" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="dashboard-list-item__title">{p.home}</span>
            <span className="dashboard-list-item__body">
              {locale === "ar" ? "الرجوع إلى التايم لاين." : "Back to timeline."}
            </span>
            <span className="dashboard-list-item__open">{p.open}</span>
          </Link>
        </div>

        <nav className="dashboard-list-nav" aria-label="Dashboard navigation">
          {p.sections.map((section) => (
            <Link key={section.href} href={section.href} className="dashboard-list-item">
              <span className="dashboard-list-item__title">{section.title}</span>
              <span className="dashboard-list-item__body">{section.body}</span>
              <span className="dashboard-list-item__open">{p.open}</span>
            </Link>
          ))}
        </nav>
      </section>
  );
}
