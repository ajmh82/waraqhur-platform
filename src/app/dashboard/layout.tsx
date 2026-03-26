import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section
          className="page-section"
          style={{
            display: "grid",
            gridTemplateColumns: "320px minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <aside style={{ display: "grid", gap: "16px" }}>
            <div
              className="state-card"
              style={{
                maxWidth: "100%",
                margin: 0,
                display: "grid",
                gap: "12px",
              }}
            >
              <p className="section-heading__eyebrow">لوحة التحكم</p>
              <h1 style={{ margin: 0, fontSize: "28px" }}>مساحتك الشخصية</h1>
              <p style={{ margin: 0 }}>
                هذه المساحة مخصصة لإدارة ملفك الشخصي، إعدادات الحساب، الأمان،
                الدعوات، الإشعارات، والنشاط من مكان واحد واضح.
              </p>
            </div>

            <DashboardNav />
          </aside>

          <section style={{ minWidth: 0 }}>{children}</section>
        </section>
      </div>
    </main>
  );
}
