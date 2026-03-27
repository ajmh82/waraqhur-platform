import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppShell>
      <section className="dashboard-shell__content">{children}</section>
    </AppShell>
  );
}
