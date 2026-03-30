import { AppHeader } from "@/components/layout/app-header";
import { DirSync } from "@/components/layout/dir-sync";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { GlobalBackButton } from "@/components/navigation/global-back-button";

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="page-stack"
      style={{
        minHeight: "100dvh",
        paddingTop: "72px",
        paddingBottom: "72px",
      }}
    >
      <DirSync />

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
        }}
      >
        <AppHeader />
      </div>

      <GlobalBackButton />

      <main className="page-container" style={{ paddingTop: 0 }}>
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
