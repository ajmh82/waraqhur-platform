import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardCopy } from "@/lib/dashboard-copy";

const pageCopy = {
  ar: {
    eyebrow: "النشاط",
    description: "وصول سريع لأهم أجزاء نشاطك داخل المنصة.",
    cards: [
      { href: "/timeline", title: "التايملاين", body: "تابع أحدث التغريدات والتفاعل." },
      { href: "/messages", title: "الرسائل", body: "افتح محادثاتك الخاصة." },
      { href: "/dashboard/notifications", title: "الإشعارات", body: "راجع آخر التنبيهات." },
    ],
    open: "فتح",
  },
  en: {
    eyebrow: "Activity",
    description: "Quick access to your key activity areas on the platform.",
    cards: [
      { href: "/timeline", title: "Timeline", body: "Follow latest posts and interactions." },
      { href: "/messages", title: "Messages", body: "Open your private conversations." },
      { href: "/dashboard/notifications", title: "Notifications", body: "Review recent alerts." },
    ],
    open: "Open",
  },
} as const;

export default async function DashboardActivityPage() {
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
          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.2 }}>{t.activity}</h1>
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
