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
        <section className="dashboard-shell">
          <aside className="dashboard-shell__sidebar">
            <div className="dashboard-shell__sidebar-card">
              <p className="section-heading__eyebrow">لوحة التحكم</p>
              <h1 className="dashboard-shell__title">مساحتك الشخصية</h1>
              <p className="dashboard-shell__description">
                أدِر حسابك وملفك الشخصي والأمان والدعوات والإشعارات من مكان واحد.
              </p>
            </div>
            <DashboardNav />
          </aside>
          <section className="dashboard-shell__content">{children}</section>
        </section>
      </div>
    </main>
  );
}
