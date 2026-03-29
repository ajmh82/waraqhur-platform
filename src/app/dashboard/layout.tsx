import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SidebarContextNav } from "@/components/layout/sidebar-context-nav";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppShell>
      <SidebarContextNav />
      <section className="dashboard-shell__content">{children}</section>
    </AppShell>
  );
}
