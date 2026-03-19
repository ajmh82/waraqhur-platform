import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="dashboard-shell">
          <aside className="dashboard-shell__sidebar">
            <div className="dashboard-shell__sidebar-card">
              <p className="section-heading__eyebrow">User Dashboard</p>
              <h1 className="dashboard-shell__title">Your workspace</h1>
              <p className="dashboard-shell__description">
                Manage your profile, account settings, security, invitations,
                notifications, and activity from one mobile-first layout.
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
