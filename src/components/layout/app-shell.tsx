import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export async function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="page-stack page-stack--social">
      <div className="page-container page-container--social">
        <AppHeader />
        {children}
      </div>
      <MobileBottomNav />
    </main>
  );
}
