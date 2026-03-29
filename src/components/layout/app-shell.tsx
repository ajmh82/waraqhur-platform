import { AppHeader } from "@/components/layout/app-header";
import { DirSync } from "@/components/layout/dir-sync";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  return (
    <div className="page-stack">
      <DirSync />
      <AppHeader />
      <main className="page-container">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
